import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export default function Debts() {
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    creditorName: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const utils = trpc.useUtils();
  const { data: debts, isLoading } = trpc.debts.list.useQuery(undefined, { enabled: isAuthenticated });

  const createDebt = trpc.debts.create.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      utils.dashboard.metrics.invalidate();
      setFormData({ creditorName: "", amount: "", description: "", dueDate: "" });
      setIsDialogOpen(false);
      toast.success("Deuda registrada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar deuda");
    },
  });

  const deleteDebt = trpc.debts.delete.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success("Deuda eliminada");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar deuda");
    },
  });

  const markAsPaid = trpc.debts.markAsPaid.useMutation({
    onSuccess: () => {
      utils.debts.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success("Deuda marcada como pagada");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar deuda");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creditorName || !formData.amount) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    createDebt.mutate({
      creditorName: formData.creditorName,
      amount: parseFloat(formData.amount),
      description: formData.description,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pagada</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pendiente</Badge>;
      case "overdue":
        return <Badge className="bg-red-500">Vencida</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Por favor inicia sesión</p>
      </div>
    );
  }

  const totalDebts = debts?.reduce((sum, debt) => sum + parseFloat(debt.amount as any), 0) || 0;
  const pendingDebts = debts?.filter((d) => d.status === "pending").reduce((sum, debt) => sum + parseFloat(debt.amount as any), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deudas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tus deudas personales</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Deuda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nueva Deuda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="creditor">Acreedor *</Label>
                <Input
                  id="creditor"
                  placeholder="Nombre del acreedor"
                  value={formData.creditorName}
                  onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Detalles de la deuda..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createDebt.isPending}>
                {createDebt.isPending ? "Guardando..." : "Guardar Deuda"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deudas Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDebts)}</div>
            <p className="text-xs text-muted-foreground mt-1">{debts?.length || 0} deudas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deudas Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingDebts)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {debts?.filter((d) => d.status === "pending").length || 0} por pagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Debts Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Historial de Deudas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando deudas...</div>
          ) : debts && debts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acreedor</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debts.map((debt) => (
                    <TableRow key={debt.id}>
                      <TableCell className="text-sm font-medium">{debt.creditorName}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(parseFloat(debt.amount as any))}</TableCell>
                      <TableCell className="text-sm">
                        {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("es-ES") : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(debt.status)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {debt.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsPaid.mutate({ id: debt.id })}
                            disabled={markAsPaid.isPending}
                            title="Marcar como pagada"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDebt.mutate({ id: debt.id })}
                          disabled={deleteDebt.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay deudas registradas. ¡Que bien!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
