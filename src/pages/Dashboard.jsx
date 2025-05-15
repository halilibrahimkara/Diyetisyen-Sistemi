import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { calculateBMI, getBMICategory, calculateDailyCalories } from '../utils/calculations'
import { Layout, Menu, Card, Typography, Form, Input, InputNumber, Select, Button, Table, Space, message } from 'antd'
import { UserOutlined, CalendarOutlined, AppstoreOutlined, CheckOutlined, ScheduleOutlined, CloudUploadOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Title, Text } = Typography
const { Option } = Select
const { Sider, Content } = Layout

// SheetBest API endpoint - Danışanlar sayfası
const CONSULTANTS_API_URL = 'https://api.sheetbest.com/sheets/2a23f751-7844-44e6-a195-39fdfc3f6b21/tabs/Danışanlar';

const initialForm = {
  name: '',
  email: '',
  age: null,
  height: null,
  weight: null,
  gender: 'male',
  activity: 'low',
}

const activityLabels = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
}

// Google Sheets'ten satır silme işlevi
const deleteConsultantFromGoogleSheets = async (consultant) => {
  try {
    // SheetBest API, kayıt silme için şu formatı kullanır:
    // email alanına göre tam eşleşmeyle kayıt silme
    const response = await axios.delete(`${CONSULTANTS_API_URL}/query?email=${encodeURIComponent(consultant.email)}`);
    
    if (response.status === 200) {
      console.log('Danışan Google Sheets\'ten başarıyla silindi:', response.data);
      return true;
    } else {
      throw new Error('API yanıtı başarısız: ' + response.status);
    }
  } catch (error) {
    console.error('Google Sheets\'ten silme hatası:', error);
    throw error;
  }
};

// Google Sheets'e veri kaydetme işlevi
const saveToGoogleSheets = async (data) => {
  try {
    // Google Sheets'e uygun formatta veriler oluştur (her danışan bir satır olacak)
    const formattedData = data.map(consultant => ({
      ad_soyad: consultant.name,
      email: consultant.email,
      yas: consultant.age,
      boy: consultant.height,
      kilo: consultant.weight,
      cinsiyet: consultant.gender === 'male' ? 'Erkek' : 'Kadın',
      aktivite: activityLabels[consultant.activity],
      vki: consultant.bmi,
      vki_durumu: consultant.bmiCategory,
      gunluk_kalori: consultant.dailyCalories
    }));

    // SheetBest API'ye POST isteği
    const response = await axios.post(CONSULTANTS_API_URL, formattedData);
    
    // Başarılı yanıt
    if (response.status === 200) {
      console.log('Veriler Google Sheets\'e başarıyla kaydedildi:', response.data);
      return true;
    } else {
      throw new Error('API yanıtı başarısız: ' + response.status);
    }
  } catch (error) {
    console.error('Google Sheets kaydetme hatası:', error);
    throw error;
  }
};

// Google Sheets'teki bir danışanı güncelleme işlevi
const updateConsultantInGoogleSheets = async (consultant) => {
  try {
    // Güncelleme için danışanın verilerini formatlayalım
    const formattedData = {
      ad_soyad: consultant.name,
      email: consultant.email,
      yas: consultant.age,
      boy: consultant.height,
      kilo: consultant.weight,
      cinsiyet: consultant.gender === 'male' ? 'Erkek' : 'Kadın',
      aktivite: activityLabels[consultant.activity],
      vki: consultant.bmi,
      vki_durumu: consultant.bmiCategory,
      gunluk_kalori: consultant.dailyCalories
    };

    // SheetBest API query parametresi ile e-posta eşleşmesine göre güncelleme yap
    // NOT: Bu, var olan satırı arıyor ve güncelleniyor, yeni satır eklenmiyor
    const response = await axios.put(`${CONSULTANTS_API_URL}/query?email=${encodeURIComponent(consultant.email)}`, formattedData);
    
    if (response.status === 200) {
      console.log('Danışan Google Sheets\'te başarıyla güncellendi:', response.data);
      return true;
    } else {
      throw new Error('API yanıtı başarısız: ' + response.status);
    }
  } catch (error) {
    console.error('Google Sheets güncelleme hatası:', error);
    throw error;
  }
};

export default function Dashboard() {
  const { user, selectConsultant, selectedConsultant, clearSelectedConsultant } = useAuth()
  const [form] = Form.useForm()
  const [consultants, setConsultants] = useState([])
  const [editIndex, setEditIndex] = useState(null)
  const [bmi, setBmi] = useState('')
  const [bmiCategory, setBmiCategory] = useState('')
  const [dailyCalories, setDailyCalories] = useState('')
  const [formValues, setFormValues] = useState(initialForm)
  const [syncing, setSyncing] = useState(false) // Google Sheets ile senkronizasyon durumu
  const navigate = useNavigate()

  // Sayfa yüklendiğinde Google Sheets'ten verileri yükle
  useEffect(() => {
    loadConsultantsFromSheets();
  }, []);

  // Google Sheets'ten danışan verilerini yükleme
  const loadConsultantsFromSheets = async () => {
    try {
      setSyncing(true);
      const response = await axios.get(CONSULTANTS_API_URL);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Google Sheets verilerini JavaScript nesnelerine dönüştür
        const loadedConsultants = response.data.map(row => ({
          name: row.ad_soyad || '',
          email: row.email || '',
          age: parseInt(row.yas) || 0,
          height: parseInt(row.boy) || 0,
          weight: parseInt(row.kilo) || 0,
          gender: row.cinsiyet === 'Erkek' ? 'male' : 'female',
          activity: Object.keys(activityLabels).find(key => activityLabels[key] === row.aktivite) || 'low',
          bmi: parseFloat(row.vki) || 0,
          bmiCategory: row.vki_durumu || '',
          dailyCalories: parseInt(row.gunluk_kalori) || 0
        }));
        
        // Yalnızca geçerli verileri filtrele
        const validConsultants = loadedConsultants.filter(c => c.name && c.name.trim() !== '');
        
        if (validConsultants.length > 0) {
          setConsultants(validConsultants);
          message.success('Danışan verileri başarıyla yüklendi.');
        } else {
          // Geçerli danışan yoksa, boş liste ayarla
          setConsultants([]);
          // Seçili danışanı temizle
          clearSelectedConsultant();
          message.info('Henüz kayıtlı danışan bulunmuyor.');
        }
      } else {
        // Veri yoksa, boş liste ayarla
        setConsultants([]);
        // Seçili danışanı temizle
        clearSelectedConsultant();
        message.info('Henüz kayıtlı danışan bulunmuyor.');
      }
    } catch (error) {
      console.error('Google Sheets\'ten veri yükleme hatası:', error);
      message.error('Veriler yüklenemedi: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Form değerleri değişince state'i güncelle ve otomatik hesapla
  const handleValuesChange = (changed, all) => {
    // InputNumber null yerine undefined dönebiliyor, bunu düzelt
    const fixedValues = {
      ...all,
      age: all.age || null,
      height: all.height || null,
      weight: all.weight || null
    }
    setFormValues(fixedValues)
    
    // Tüm zorunlu alanlar doluysa otomatik hesapla
    const { name, weight, height, age, gender, activity } = fixedValues;
    
    // VKİ hesapla (boy ve kilo varsa)
    if (weight && height) {
      const newBmi = calculateBMI(Number(weight), Number(height));
      setBmi(newBmi);
      setBmiCategory(getBMICategory(newBmi));
      
      // Günlük kalori hesapla (tüm bilgiler varsa)
      if (age && gender && activity) {
        const newDailyCalories = calculateDailyCalories(
          Number(weight), 
          Number(height), 
          Number(age), 
          gender, 
          activity
        );
        setDailyCalories(newDailyCalories);
      }
    } else {
      // Eksik varsa temizle
      setBmi('');
      setBmiCategory('');
      setDailyCalories('');
    }
  }

  // Form submit
  const onFinish = async (values) => {
    // Eksik alanları kontrol et
    if (!values.name || !values.age || !values.height || !values.weight || !values.gender || !values.activity) {
      message.error('Lütfen tüm alanları doldurunuz!');
      return;
    }

    // Tüm alanları number'a dönüştür
    const age = Number(values.age);
    const height = Number(values.height);
    const weight = Number(values.weight);

    // VKİ ve kalori hesapla
    const newBmi = calculateBMI(weight, height);
    const newBmiCategory = getBMICategory(newBmi);
    const newDailyCalories = calculateDailyCalories(
      weight, height, age, values.gender, values.activity
    );

    // Danışan bilgilerini hazırla
    const newConsultant = {
      ...values,
      age,
      height,
      weight,
      bmi: newBmi,
      bmiCategory: newBmiCategory,
      dailyCalories: newDailyCalories,
    };

    let newConsultants = [];
    let actionMessage = '';
    
    // Form ve state'i sıfırla
    form.resetFields();
    setFormValues(initialForm);
    setBmi('');
    setBmiCategory('');
    setDailyCalories('');
    
    try {
      setSyncing(true);
      
      // Düzenleme mi ekleme mi?
      if (editIndex !== null) {
        // Düzenleme işlemi - Google Sheets'teki danışanı güncelle
        await updateConsultantInGoogleSheets(newConsultant);
        
        // UI'daki listeyi güncelle
        newConsultants = consultants.map((c, i) => (i === editIndex ? newConsultant : c));
        actionMessage = 'Danışan bilgileri güncellendi!';
      } else {
        // Yeni danışan ekleme - Tüm verileri Google Sheets'e gönder
        // Burada danışanlar tekrarlanmaması için mevcut verileri silip yeniden eklemek yerine
        // yeni danışanı ekleyelim
        const formattedConsultant = {
          ad_soyad: newConsultant.name,
          email: newConsultant.email,
          yas: newConsultant.age,
          boy: newConsultant.height,
          kilo: newConsultant.weight,
          cinsiyet: newConsultant.gender === 'male' ? 'Erkek' : 'Kadın',
          aktivite: activityLabels[newConsultant.activity],
          vki: newConsultant.bmi,
          vki_durumu: newConsultant.bmiCategory,
          gunluk_kalori: newConsultant.dailyCalories
        };
        
        // Yeni danışanı Google Sheets'e ekle
        const response = await axios.post(CONSULTANTS_API_URL, [formattedConsultant]);
        
        if (response.status !== 200) {
          throw new Error('API yanıtı başarısız: ' + response.status);
        }
        
        newConsultants = [...consultants, newConsultant];
        actionMessage = 'Danışan bilgileri kaydedildi!';
      }
      
      // UI'ı güncelle
      setConsultants(newConsultants);
      message.success(actionMessage + ' Veriler Google Sheets\'e kaydedildi.');
    } catch (error) {
      console.error('Google Sheets işlem hatası:', error);
      message.warning(actionMessage + ' Ancak Google Sheets\'e kaydedilemedi. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setSyncing(false);
      setEditIndex(null); // Düzenleme modunu kapat
    }
  }

  const handleEdit = (idx) => {
    const c = consultants[idx]
    form.setFieldsValue({
      name: c.name,
      email: c.email,
      age: c.age,
      height: c.height,
      weight: c.weight,
      gender: c.gender,
      activity: c.activity,
    })
    
    // Aynı zamanda VKİ ve kalori değerlerini güncelle
    setBmi(c.bmi);
    setBmiCategory(c.bmiCategory);
    setDailyCalories(c.dailyCalories);
    
    setEditIndex(idx)
  }

  const handleDelete = async (idx) => {
    const consultantToDelete = consultants[idx];
    const newConsultants = consultants.filter((_, i) => i !== idx);
    
    // Form ve state'i sıfırla (eğer düzenleme modundaysa)
    if (editIndex === idx) {
      setEditIndex(null);
      form.resetFields();
      setFormValues(initialForm);
      setBmi('');
      setBmiCategory('');
      setDailyCalories('');
    }
    
    // Eğer silinen danışan seçili danışan ise, seçili danışanı temizle
    if (selectedConsultant && selectedConsultant.id === idx.toString()) {
      clearSelectedConsultant();
    }
    
    try {
      setSyncing(true);
      // Önce UI'dan sil
      setConsultants(newConsultants);
      
      // Ardından Google Sheets'ten direkt o satırı sil
      await deleteConsultantFromGoogleSheets(consultantToDelete);
      message.success('Danışan başarıyla silindi.');
    } catch (error) {
      console.error('Google Sheets silme hatası:', error);
      message.error('Danışan silinirken hata oluştu: ' + error.message);
      
      // Hata durumunda danışanları yeniden yükle (doğru veriyi göstermek için)
      loadConsultantsFromSheets();
    } finally {
      setSyncing(false);
    }
  }

  // Table columns
  const columns = [
    { title: 'Ad Soyad', dataIndex: 'name', key: 'name', align: 'center' },
    { title: 'E-mail', dataIndex: 'email', key: 'email', align: 'center' },
    { title: 'Yaş', dataIndex: 'age', key: 'age', align: 'center' },
    { title: 'Boy', dataIndex: 'height', key: 'height', align: 'center' },
    { title: 'Kilo', dataIndex: 'weight', key: 'weight', align: 'center' },
    { title: 'Cinsiyet', dataIndex: 'gender', key: 'gender', align: 'center', render: v => v === 'male' ? 'Erkek' : 'Kadın' },
    { title: 'Aktivite', dataIndex: 'activity', key: 'activity', align: 'center', render: v => activityLabels[v] },
    { title: 'VKİ', dataIndex: 'bmi', key: 'bmi', align: 'center' },
    { title: 'VKİ Durumu', dataIndex: 'bmiCategory', key: 'bmiCategory', align: 'center' },
    { title: 'Günlük Kalori', dataIndex: 'dailyCalories', key: 'dailyCalories', align: 'center' },
    {
      title: 'İşlemler',
      key: 'actions',
      align: 'center',
      render: (_, record, idx) => {
        return (
          <Space>
            <Button onClick={() => handleEdit(idx)} type="default" size="small">Güncelle</Button>
            <Button onClick={() => handleDelete(idx)} type="primary" danger size="small">Sil</Button>
            <Button 
              onClick={() => {
                // Danışan bilgilerini context'e kaydet
                selectConsultant({
                  id: idx.toString(),
                  name: record.name,
                  email: record.email,
                  dailyCalories: record.dailyCalories
                });
                // Diyet planı sayfasına yönlendir
                navigate(`/diet-plan?id=${idx}&name=${record.name}&email=${record.email}&dailyCalories=${record.dailyCalories}`);
              }} 
              type="primary" 
              size="small"
              icon={<ScheduleOutlined />}
            >
              Diyet Planı Oluştur
            </Button>
          </Space>
        );
      },
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Layout>
        <Sider width={200} style={{ background: '#001529' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            style={{ height: '100%', borderRight: 0 }}
            theme="dark"
          >
            <Menu.Item key="1" icon={<AppstoreOutlined />}>
              <Link to="/dashboard">Danışman Bilgileri</Link>
            </Menu.Item>
            <Menu.Item key="2" icon={<CalendarOutlined />}>
              <Link to="/diet-plan">Diyet Planı</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout style={{ padding: '24px', background: '#f5f5f5' }}>
          <Content>
            <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none' }}>
              <Title level={3} style={{ marginBottom: 0 }}>Hoş Geldiniz</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
                Danışanların diyet planlarını hazırlamak ve düzenlemek için menüyü kullanabilirsiniz.
              </Text>
              <Form
                form={form}
                layout="inline"
                onFinish={onFinish}
                initialValues={initialForm}
                onValuesChange={handleValuesChange}
                style={{ flexWrap: 'wrap', gap: 24, marginBottom: 32, justifyContent: 'flex-start', display: 'flex' }}
              >
                <Form.Item name="name" label="Ad Soyad" rules={[{ required: true, message: 'Ad Soyad giriniz!' }]}> 
                  <Input style={{ width: 180 }} /> 
                </Form.Item>
                <Form.Item name="email" label="E-mail" rules={[{ required: true, message: 'E-mail giriniz!', type: 'email' }]}> 
                  <Input style={{ width: 200 }} /> 
                </Form.Item>
                <Form.Item name="age" label="Yaş" rules={[{ required: true, message: 'Yaş giriniz!' }]}> 
                  <InputNumber min={1} max={120} style={{ width: 80 }} /> 
                </Form.Item>
                <Form.Item name="height" label="Boy (cm)" rules={[{ required: true, message: 'Boy giriniz!' }]}> 
                  <InputNumber min={50} max={250} style={{ width: 90 }} /> 
                </Form.Item>
                <Form.Item name="weight" label="Kilo (kg)" rules={[{ required: true, message: 'Kilo giriniz!' }]}> 
                  <InputNumber min={20} max={300} style={{ width: 90 }} /> 
                </Form.Item>
                <Form.Item name="gender" label="Cinsiyet" rules={[{ required: true }]}> 
                  <Select style={{ width: 100 }}>
                    <Option value="male">Erkek</Option>
                    <Option value="female">Kadın</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="activity" label="Aktivite Seviyesi" rules={[{ required: true }]}> 
                  <Select style={{ width: 120 }}>
                    <Option value="low">Düşük</Option>
                    <Option value="medium">Orta</Option>
                    <Option value="high">Yüksek</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="VKİ">
                  <Input value={bmi} disabled style={{ width: 80, background: '#f5f5f5' }} />
                </Form.Item>
                <Form.Item label="VKİ Durumu">
                  <Input value={bmiCategory} disabled style={{ width: 110, background: '#f5f5f5' }} />
                </Form.Item>
                <Form.Item label="Günlük Kalori">
                  <Input value={dailyCalories} disabled style={{ width: 110, background: '#f5f5f5' }} />
                </Form.Item>
                <Form.Item style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginTop: 16 }}>
                  <Button type="primary" htmlType="submit" size="large">
                    {editIndex !== null ? 'Güncelle' : 'Bilgileri Kaydet'}
                  </Button>
                </Form.Item>
              </Form>

              <Table
                columns={columns}
                dataSource={consultants}
                rowKey={(r, idx) => idx}
                pagination={false}
                locale={{ emptyText: 'Henüz danışan eklenmedi.' }}
                style={{ background: '#fff', marginTop: 16 }}
                scroll={{ x: true }}
              />
            </Card>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
} 