import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedShell from "./components/ProtectedShell.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import ConsultaClientes from "./pages/ConsultaClientes.jsx";
import MantenimientoCliente from "./pages/MantenimientoCliente.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/register" element={<Navigate to="/registro" replace />} />

      <Route element={<ProtectedShell />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="clientes" element={<ConsultaClientes />} />
        <Route path="clientes/mantenimiento" element={<MantenimientoCliente />} />
        <Route path="clientes/mantenimiento/:id" element={<MantenimientoCliente />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
