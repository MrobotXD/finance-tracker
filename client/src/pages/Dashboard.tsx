import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { CategoryPieChart, MonthlyBarChart, TrendLineChart } from "@/components/ExpenseCharts";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });

  const { data: metrics, isLoading: metricsLoading } = trpc.dashboard.metrics.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    } as any,
    { enabled: isAuthenticated }
  );

  const { data: trend, isLoading: trendLoading } = trpc.dashboard.monthlyTrend.useQuery(
    { months: 6 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Por favor inicia sesión para continuar</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Get expenses for charts
  const { data: expenses = [], isLoading: expensesLoading } = trpc.expenses.list.useQuery({} as any, {
    enabled: isAuthenticated,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financiero</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen de tus finanzas personales
          </p>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.totalExpenses || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.expensesCount || 0} transacciones
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Debts Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deudas Totales</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.totalDebts || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.debtsCount || 0} deudas registradas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Debts Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deudas Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.pendingDebts || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Por pagar
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency((metrics?.totalExpenses || 0) - (metrics?.totalDebts || 0))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gastos vs Deudas
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expenses by Category */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {metrics?.expensesByCategory && Array.isArray(metrics.expensesByCategory) && metrics.expensesByCategory.length > 0 ? (
                  metrics.expensesByCategory.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm">{item.categoryName}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(parseFloat(item.total))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin gastos en este período</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="text-sm font-medium">
                {dateRange.startDate.toLocaleDateString("es-ES", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Usuario</p>
              <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Análisis Detallado</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryPieChart expenses={expenses} isLoading={expensesLoading} />
          <MonthlyBarChart expenses={expenses} isLoading={expensesLoading} />
        </div>
        <div className="mt-6">
          <TrendLineChart expenses={expenses} isLoading={expensesLoading} />
        </div>
      </div>
    </div>
  );
}
