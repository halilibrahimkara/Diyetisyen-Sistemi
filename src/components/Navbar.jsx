// React Router'dan Link bileşenini içe aktarma - sayfalar arası gezinme için
import { Link, useNavigate } from 'react-router-dom'
// Kimlik doğrulama için useAuth hook'unu içe aktarma - kullanıcı bilgisi ve çıkış fonksiyonu için
import { useAuth } from '../context/AuthContext'
// Ant Design bileşenlerini içe aktarma - UI elementleri olarak kullanılacaklar
import { Layout, Button, Space, Typography, Menu, message } from 'antd'

// Layout bileşeninden Header'ı destructuring ile çıkarma - üst menü barı olarak kullanılacak
const { Header } = Layout
// Typography bileşeninden Text'i destructuring ile çıkarma - metin öğeleri için
const { Text } = Typography

// Navbar bileşeni tanımı - uygulamanın üst kısmında görünen menü barı
export default function Navbar() {
  // useAuth hook'undan user ve logout fonksiyonlarını alma - kullanıcı yönetimi için
  const { user, logout, selectedConsultant } = useAuth()
  const navigate = useNavigate()
  
  // Diyet planı sayfasına geçiş için kontrol
  const handleDietPlanClick = (e) => {
    if (!selectedConsultant) {
      e.preventDefault(); // Varsayılan link davranışını engelle
      message.warning('Lütfen önce bir danışan seçin!');
      navigate('/dashboard'); // Dashboard sayfasına yönlendir
    }
  };

  // Bileşenin JSX yapısını döndürme
  return (
    // Header bileşeni - üst menü barı olarak kullanılır
    <Header style={{ 
      background: '#1890ff',  // Arka plan rengi - mavi
      padding: '0 24px',      // İç kenar boşluğu - sağdan soldan 24px
      display: 'flex',        // Esnek yerleşim modeli kullanma
      justifyContent: 'space-between', // İçeriği sağa ve sola hizalama
      alignItems: 'center',   // İçeriği dikey olarak ortalama
      height: '64px',         // Yükseklik - 64 piksel
      color: 'white',         // Yazı rengi - beyaz
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', // Alt kenar gölgesi - hafif 3D efekti
      zIndex: 1000,           // Katman düzeni - diğer öğelerin üzerinde görünmesi için
    }}>
      {/* Sol tarafta yer alan logo ve başlık bölümü */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Ana sayfaya (Dashboard) yönlendiren link - logoyu tıklanabilir yapar */}
        <Link to="/dashboard" style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
          Diyetisyen Sistemi
        </Link>
        
        {/* Menü öğeleri */}
        <Menu
          theme="dark"
          mode="horizontal"
          style={{ background: 'transparent', color: 'white', borderBottom: 'none', marginLeft: 30 }}
        >
          <Menu.Item key="dashboard">
            <Link to="/dashboard">Danışman Bilgileri</Link>
          </Menu.Item>
          <Menu.Item key="dietplan">
            <Link to="/diet-plan" onClick={handleDietPlanClick}>Diyet Planı</Link>
          </Menu.Item>
        </Menu>
      </div>
      
      {/* Sağ tarafta yer alan butonlar bölümü - yatay düzende elementleri gruplar */}
      <Space>
        {/* Seçili danışan bilgisini göster */}
        {selectedConsultant && (
          <Text style={{ color: 'white', marginRight: 16 }}>
            Danışan: {selectedConsultant.name}
          </Text>
        )}
        
        {/* Çıkış yapma butonu - tıklandığında logout fonksiyonunu çağırır, kullanıcı oturumunu sonlandırır */}
        <Button onClick={logout} ghost style={{ borderColor: 'white', color: 'white' }}>
          Çıkış Yap
        </Button>
      </Space>
    </Header>
  )
} 