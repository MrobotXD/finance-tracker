import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function Expenses() {
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    categoryId: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const utils = trpc.useUtils();
  const { data: categories } = trpc.categories.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: expenses, isLoading } = trpc.expenses.list.useQuery({}, { enabled: isAuthenticated });

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.dashboard.metrics.invalidate();
      setFormData({ amount: "", categoryId: "", description: "", date: new Date().toISOString().split("T")[0] });
      setIsDialogOpen(false);
      toast.success("Gasto registrado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar gasto");
    },
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success("Gasto eliminado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar gasto");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.categoryId) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    createExpense.mutate({
      amount: parseFloat(formData.amount),
      categoryId: parseInt(formData.categoryId),
      description: formData.description,
      date: new Date(formData.date),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getCategoryName = (categoryId: number) => {
    return categories?.find((c) => c.id === categoryId)?.name || "Sin categoría";
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Por favor inicia sesión</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tus gastos personales</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Gastos desde Excel</DialogTitle>
              </DialogHeader>
              <ImportExcelDialog onClose={() => setIsImportOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalles del gasto..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createExpense.isPending}>
                  {createExpense.isPending ? "Guardando..." : "Guardar Gasto"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expenses Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Historial de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando gastos...</div>
          ) : expenses && expenses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-sm">
                        {new Date(expense.date).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-sm">{expense.description || "-"}</TableCell>
                      <TableCell className="text-sm">{getCategoryName(expense.categoryId)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(expense.amount as any))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense.mutate({ id: expense.id })}
                          disabled={deleteExpense.isPending}
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
              No hay gastos registrados. ¡Comienza a registrar tus gastos!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportExcelDialog({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState({
    amount: 0,
    category: 1,
    date: 2,
    description: 3,
  });
  const [preview, setPreview] = useState<any>(null);

  const utils = trpc.useUtils();
  const previewExcel = trpc.expenses.previewExcel.useQuery(
    { fileData: "", fileName: "" },
    { enabled: false }
  );
  const importExcel = trpc.expenses.importFromExcel.useMutation({
    onSuccess: (result) => {
      utils.expenses.list.invalidate();
      utils.dashboard.metrics.invalidate();
      toast.success(`${result.successCount} gastos importados exitosamente`);
      if (result.errorCount > 0) {
        toast.error(`${result.errorCount} filas con error`);
      }
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Error al importar Excel");
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Read file and preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(",")[1];
      if (base64) {
        try {
          // Use direct API call since previewExcel is a query
          const response = await fetch("/api/trpc/expenses.previewExcel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileData: base64,
              fileName: selectedFile.name,
            }),
          });
          const data = await response.json();
          if (data.result?.data) {
            setPreview(data.result.data);
          }
        } catch (error) {
          toast.error("Error al procesar archivo");
        }
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(",")[1];
      if (base64) {
        try {
          await importExcel.mutateAsync({
            fileData: base64,
            fileName: file.name,
            columnMapping,
          });
        } catch (error) {
          console.error(error);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file">Selecciona archivo Excel</Label>
        <Input
          id="file"
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          className="mt-2"
        />
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Vista previa ({preview.totalRows} filas)</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {preview.headers.map((header: any, idx: number) => (
                      <th key={idx} className="text-left px-2 py-1 border-b">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row: any, ridx: number) => (
                    <tr key={ridx}>
                      {row.map((cell: any, cidx: number) => (
                        <td key={cidx} className="px-2 py-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Mapeo de columnas</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Monto (columna)</Label>
                <Input
                  type="number"
                  min="0"
                  value={columnMapping.amount}
                  onChange={(e) => setColumnMapping({ ...columnMapping, amount: parseInt(e.target.value) })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Categoría (columna)</Label>
                <Input
                  type="number"
                  min="0"
                  value={columnMapping.category}
                  onChange={(e) => setColumnMapping({ ...columnMapping, category: parseInt(e.target.value) })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Fecha (columna)</Label>
                <Input
                  type="number"
                  min="0"
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping({ ...columnMapping, date: parseInt(e.target.value) })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Descripción (columna)</Label>
                <Input
                  type="number"
                  min="0"
                  value={columnMapping.description}
                  onChange={(e) => setColumnMapping({ ...columnMapping, description: parseInt(e.target.value) })}
                  className="h-8"
                />
              </div>
            </div>
          </div>

            <Button onClick={handleImport} className="w-full" disabled={importExcel.isPending}>
              {importExcel.isPending ? "Importando..." : "Importar Gastos"}
            </Button>
        </div>
      )}
    </div>
  );
}
