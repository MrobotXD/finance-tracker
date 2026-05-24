import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import * as XLSX from "xlsx";
import { categorizeExpense } from "./categorization";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Categories router
  categories: router({
    list: protectedProcedure.query(async () => {
      return db.getCategories();
    }),
  }),

  // Tags router
  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTags(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        return db.createTag(ctx.user.id, input.name);
      }),
  }),

  // Expenses router
  expenses: router({
    list: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          categoryId: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return db.getUserExpenses(ctx.user.id, {
          startDate: input.startDate,
          endDate: input.endDate,
          categoryId: input.categoryId,
        });
      }),

    create: protectedProcedure
      .input(
        z.object({
          amount: z.string().or(z.number()),
          categoryId: z.number(),
          description: z.string().optional(),
          date: z.date(),
          tags: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const amount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
        
        if (isNaN(amount) || amount <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El monto debe ser mayor a 0" });
        }

        const result = await db.createExpense({
          userId: ctx.user.id,
          amount: amount.toString(),
          categoryId: input.categoryId,
          description: input.description,
          date: input.date,
        });

        // Add tags if provided
        if (input.tags && input.tags.length > 0) {
          // Note: insertId might not be available, tags can be added later via separate API
        }

        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          amount: z.string().or(z.number()).optional(),
          categoryId: z.number().optional(),
          description: z.string().optional(),
          date: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const expense = await db.getExpenseById(input.id);
        if (!expense || expense.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para editar este gasto" });
        }

        const updateData: Record<string, any> = {};
        
        if (input.amount !== undefined) {
          const amount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
          if (isNaN(amount) || amount <= 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "El monto debe ser mayor a 0" });
          }
          updateData.amount = amount;
        }
        if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.date !== undefined) updateData.date = input.date;

        return db.updateExpense(input.id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const expense = await db.getExpenseById(input.id);
        if (!expense || expense.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para eliminar este gasto" });
        }

        return db.deleteExpense(input.id);
      }),

    // Import from Excel
    importFromExcel: protectedProcedure
      .input(
        z.object({
          fileData: z.string(), // base64 encoded file
          fileName: z.string(),
          columnMapping: z.object({
            amount: z.number(),
            category: z.number(),
            date: z.number(),
            description: z.number().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Decode base64 file
          const buffer = Buffer.from(input.fileData, "base64");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          if (!worksheet) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "No data found in Excel file" });
          }

          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
          const categories = await db.getCategories();
          const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

          const results = [];
          let successCount = 0;
          let errorCount = 0;

          // Skip header row
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            try {
              const amount = parseFloat(row[input.columnMapping.amount]);
              const categoryName = row[input.columnMapping.category]?.toString() || "Otros";
              const dateStr = row[input.columnMapping.date];
              const description = input.columnMapping.description ? row[input.columnMapping.description]?.toString() : "";

              if (isNaN(amount) || amount <= 0) {
                errorCount++;
                results.push({ row: i + 1, error: "Monto inválido o menor a 0" });
                continue;
              }

              // Parse date
              let date = new Date();
              if (dateStr) {
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  date = parsedDate;
                }
              }

              // Find category ID with automatic categorization
              let categoryId = categoryMap.get(categoryName.toLowerCase());
              if (!categoryId) {
                // Try automatic categorization based on description
                const suggestedCategory = categorizeExpense(description, categoryName);
                categoryId = categoryMap.get(suggestedCategory.toLowerCase()) || categoryMap.get("otros") || 9;
              }

              await db.createExpense({
                userId: ctx.user.id,
                amount: amount.toString(),
                categoryId,
                description,
                date,
              });

              successCount++;
            } catch (error) {
              errorCount++;
              results.push({ row: i + 1, error: (error as Error).message });
            }
          }

          return {
            successCount,
            errorCount,
            errors: results,
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error al procesar Excel: ${(error as Error).message}`,
          });
        }
      }),

    // Get preview of Excel data
    previewExcel: protectedProcedure
      .input(
        z.object({
          fileData: z.string(), // base64 encoded file
          fileName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const buffer = Buffer.from(input.fileData, "base64");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          if (!worksheet) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "No data found in Excel file" });
          }

          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
          
          // Return first 5 rows for preview
          return {
            headers: data[0] || [],
            preview: data.slice(1, 6),
            totalRows: Math.max(0, data.length - 1),
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error al procesar Excel: ${(error as Error).message}`,
          });
        }
      }),
  }),

  // Debts router
  debts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDebts(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          creditorName: z.string().min(1),
          amount: z.string().or(z.number()),
          description: z.string().optional(),
          dueDate: z.date().optional(),
          interestRate: z.string().or(z.number()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const amount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
        const interestRate = input.interestRate ? (typeof input.interestRate === "string" ? parseFloat(input.interestRate) : input.interestRate) : 0;
        
        if (isNaN(amount) || amount <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El monto debe ser mayor a 0" });
        }

        if (interestRate < 0 || interestRate > 100) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "La tasa de interés debe estar entre 0 y 100" });
        }

        const totalWithInterest = amount + (amount * interestRate / 100);

        return db.createDebt({
          userId: ctx.user.id,
          creditorName: input.creditorName,
          amount: amount.toString(),
          description: input.description,
          dueDate: input.dueDate,
          interestRate: interestRate.toString(),
          totalWithInterest: totalWithInterest.toString(),
          status: "pending",
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          creditorName: z.string().optional(),
          amount: z.string().or(z.number()).optional(),
          description: z.string().optional(),
          dueDate: z.date().optional(),
          interestRate: z.string().or(z.number()).optional(),
          status: z.enum(["pending", "paid", "overdue"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const debt = await db.getDebtById(input.id);
        if (!debt || debt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para editar esta deuda" });
        }

        const updateData: Record<string, any> = {};
        
        if (input.creditorName !== undefined) updateData.creditorName = input.creditorName;
        if (input.amount !== undefined) {
          const amount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
          if (isNaN(amount) || amount <= 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "El monto debe ser mayor a 0" });
          }
          updateData.amount = amount;
          // Recalculate totalWithInterest when amount changes
          const currentInterestRate = parseFloat(debt?.interestRate as any || "0");
          updateData.totalWithInterest = amount + (amount * currentInterestRate / 100);
        }
        if (input.description !== undefined) updateData.description = input.description;
        if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
        if (input.interestRate !== undefined) {
          const interestRate = typeof input.interestRate === "string" ? parseFloat(input.interestRate) : input.interestRate;
          if (interestRate < 0 || interestRate > 100) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "La tasa de interes debe estar entre 0 y 100" });
          }
          updateData.interestRate = interestRate;
          const finalAmount = updateData.amount || (debt?.amount ? parseFloat(debt.amount as any) : 0);
          updateData.totalWithInterest = finalAmount + (finalAmount * interestRate / 100);
        }
        if (input.status !== undefined) updateData.status = input.status;

        return db.updateDebt(input.id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const debt = await db.getDebtById(input.id);
        if (!debt || debt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para eliminar esta deuda" });
        }

        return db.deleteDebt(input.id);
      }),

    // Mark as paid
    markAsPaid: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const debt = await db.getDebtById(input.id);
        if (!debt || debt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para actualizar esta deuda" });
        }

        return db.updateDebt(input.id, { status: "paid" });
      }),
  }),

  // Dashboard metrics
  dashboard: router({
    metrics: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const now = new Date();
        const startDate = input.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = input.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Get total expenses for the period
        const expenses = await db.getUserExpenses(ctx.user.id, { startDate, endDate });
        const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount as any), 0);

        // Get debts
        const debts = await db.getUserDebts(ctx.user.id);
        const totalDebts = debts.reduce((sum, debt) => sum + parseFloat(debt.totalWithInterest as any || debt.amount as any), 0);
        const pendingDebts = debts.filter(d => d.status === "pending").reduce((sum, debt) => sum + parseFloat(debt.totalWithInterest as any || debt.amount as any), 0);

        // Get expenses by category
        const metrics = await db.getExpenseMetrics(ctx.user.id, startDate, endDate);

        return {
          totalExpenses,
          totalDebts,
          pendingDebts,
          expensesByCategory: metrics,
          expensesCount: expenses.length,
          debtsCount: debts.length,
        };
      }),

    monthlyTrend: protectedProcedure
      .input(
        z.object({
          months: z.number().default(6),
        })
      )
      .query(async ({ ctx, input }) => {
        const trend = [];
        const now = new Date();

        for (let i = input.months - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

          const expenses = await db.getUserExpenses(ctx.user.id, {
            startDate: date,
            endDate: nextDate,
          });

          const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount as any), 0);

          trend.push({
            month: date.toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
            total,
          });
        }

        return trend;
      }),
  }),
});

export type AppRouter = typeof appRouter;
