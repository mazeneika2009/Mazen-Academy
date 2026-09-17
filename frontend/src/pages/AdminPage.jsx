import { useAppContext } from '../context/AppContext';
import { AdminPanel } from '../components/admin/AdminPanel';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { lang, fetchGardens } = useAppContext();
  const navigate = useNavigate();

  return (
    <AdminPanel
      lang={lang}
      onGardensChange={fetchGardens}
      onClose={() => {
        navigate('/');
        fetchGardens();
      }}
    />
  );
}
