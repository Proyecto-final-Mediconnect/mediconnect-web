import { Navigate, Route, Routes } from 'react-router-dom';
import { CatalogPage } from './pages/CatalogPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfessionalRegisterPage } from './pages/ProfessionalRegisterPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* Catálogo público (ENG-49): la búsqueda de profesionales no requiere
          sesión, así que va sin guard. */}
      <Route path="/profesionales" element={<CatalogPage />} />
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        path="/registro/profesional"
        element={<ProfessionalRegisterPage />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
