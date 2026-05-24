import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface ExpenseChartProps {
  expenses: any[];
  isLoading?: boolean;
}

export function CategoryPieChart({ expenses, isLoading }: ExpenseChartProps) {
  const data = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    expenses.forEach((expense: any) => {
      const category = expense.categoryName || "Otros";
      categoryMap[category] = (categoryMap[category] || 0) + parseFloat(expense.amount || 0);
    });

    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [expenses]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
          <CardDescription>Distribución de gastos</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
          <CardDescription>Distribución de gastos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoría</CardTitle>
        <CardDescription>Distribución de gastos en el período</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: $${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface MonthlyExpenseData {
  month: string;
  total: number;
}

export function MonthlyBarChart({ expenses, isLoading }: ExpenseChartProps) {
  const data = useMemo(() => {
    const monthMap: Record<string, { total: number; date: Date }> = {};

    expenses.forEach((expense: any) => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { total: 0, date: new Date(year, month, 1) };
      }
      monthMap[monthKey].total += parseFloat(expense.amount || 0);
    });

    return Object.entries(monthMap)
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([_, { total, date }]) => ({
        month: date.toLocaleString("es-ES", { month: "short", year: "numeric" }),
        total: parseFloat(total.toFixed(2)),
      }));
  }, [expenses]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos Mensuales</CardTitle>
          <CardDescription>Tendencia de gastos por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos Mensuales</CardTitle>
          <CardDescription>Tendencia de gastos por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos Mensuales</CardTitle>
        <CardDescription>Tendencia de gastos por mes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TrendLineChart({ expenses, isLoading }: ExpenseChartProps) {
  const data = useMemo(() => {
    const sortedExpenses = [...expenses].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulativeTotal = 0;
    return sortedExpenses.map((expense: any) => {
      cumulativeTotal += parseFloat(expense.amount || 0);
      return {
        date: new Date(expense.date).toLocaleDateString("es-ES", {
          month: "short",
          day: "numeric",
        }),
        total: parseFloat(cumulativeTotal.toFixed(2)),
      };
    });
  }, [expenses]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Gastos</CardTitle>
          <CardDescription>Acumulativo en el tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Gastos</CardTitle>
          <CardDescription>Acumulativo en el tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Gastos</CardTitle>
        <CardDescription>Acumulativo en el tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value}`} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              dot={false}
              strokeWidth={2}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
