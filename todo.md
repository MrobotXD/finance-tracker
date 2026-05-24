# Finance Tracker - TODO

## Base de Datos
- [x] Crear tabla de gastos (expenses)
- [x] Crear tabla de deudas (debts)
- [x] Crear tabla de categorías (categories)
- [x] Crear tabla de etiquetas (tags)
- [x] Crear tabla de relación gastos-etiquetas (expense_tags)
- [x] Aplicar migraciones SQL

## Backend - APIs
- [x] API para crear/editar/eliminar gastos
- [x] API para listar gastos con filtros
- [x] API para crear/editar/eliminar deudas
- [x] API para listar deudas
- [x] API para marcar deudas como pagadas
- [x] API para obtener categorías predefinidas
- [x] API para importar gastos desde Excel
- [x] API para categorización automática de gastos
- [x] API para obtener métricas del dashboard (balance, gastos mes, deudas)
- [x] API para obtener datos para gráficos

## Frontend - Dashboard
- [x] Crear página principal (Home/Dashboard)
- [x] Componente de resumen financiero (tarjetas de métricas)
- [x] Componente de balance total
- [x] Componente de gastos del mes
- [x] Componente de deudas pendientes

## Frontend - Gestión de Gastos
- [x] Crear página de gastos
- [x] Formulario para agregar gasto manual
- [x] Componente de carga de archivo Excel
- [x] Modal de previsualización de importación
- [x] Tabla de transacciones con paginación
- [ ] Filtros por fecha, categoría y tipo
- [ ] Búsqueda por texto
- [x] Editar/eliminar gastos desde tabla

## Frontend - Gestión de Deudas
- [x] Crear página de deudas
- [x] Formulario para agregar deuda
- [x] Tabla de deudas con estado
- [x] Botón para marcar como pagada
- [x] Editar/eliminar deudas

## Frontend - Gráficos
- [x] Gráfico de torta por categorías
- [x] Gráfico de barras de gastos mensuales
- [x] Gráfico de línea de tendencia de gastos

## Frontend - UI/UX
- [x] Diseño elegante y premium con Tailwind CSS
- [x] Paleta de colores sofisticada
- [x] Tipografía refinada
- [ ] Animaciones suaves (básicas implementadas, pulir más)
- [x] Responsividad en móvil
- [ ] Tema claro/oscuro (opcional)

## Testing
- [x] Tests para APIs de gastos
- [x] Tests para APIs de deudas
- [x] Tests de autenticación y aislamiento de datos
- [ ] Tests para importación de Excel (funcional, sin tests)
- [ ] Tests para categorización automática (funcional, sin tests)

## Optimización
- [x] Validación de datos en frontend y backend
- [x] Manejo de errores
- [x] Loading states
- [x] Empty states
- [x] Mensajes de confirmación
