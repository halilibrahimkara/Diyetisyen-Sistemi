import { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { Layout, Menu, Card, Typography, Form, InputNumber, Input, Button, Table, Space, message, Select, Spin, Descriptions, Tag, Progress, Modal, Popconfirm, Tabs } from 'antd'
import { UserOutlined, CalendarOutlined, AppstoreOutlined, ScheduleOutlined, FireOutlined, CloudUploadOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, MailOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Title, Text } = Typography
const { Sider, Content } = Layout
const { Option } = Select
const { TabPane } = Tabs

// SheetBest API endpoints
const MEALS_API_URL = 'https://api.sheetbest.com/sheets/2a23f751-7844-44e6-a195-39fdfc3f6b21';
const DIET_PLANS_API_URL = 'https://api.sheetbest.com/sheets/2a23f751-7844-44e6-a195-39fdfc3f6b21/tabs/DiyetPlanları';
const CONSULTANTS_API_URL = 'https://api.sheetbest.com/sheets/2a23f751-7844-44e6-a195-39fdfc3f6b21/tabs/Danışanlar';

export default function DietPlan() {
  const navigate = useNavigate()
  const { user, selectedConsultant, clearSelectedConsultant } = useAuth()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  
  // Danışanı doğrulama durumu
  const [consultantVerified, setConsultantVerified] = useState(false)
  const [verifying, setVerifying] = useState(true)
  
  // Danışan bilgilerini al
  const consultantId = selectedConsultant ? selectedConsultant.id : queryParams.get('id')
  const consultantName = selectedConsultant ? selectedConsultant.name : queryParams.get('name')
  const consultantEmail = selectedConsultant ? selectedConsultant.email : queryParams.get('email')
  const dailyCalories = selectedConsultant ? selectedConsultant.dailyCalories : queryParams.get('dailyCalories')
  
  // Sayfa state'leri
  const [loading, setLoading] = useState(false)
  const [meals, setMeals] = useState([])
  const [dietPlan, setDietPlan] = useState(null)
  const [syncing, setSyncing] = useState(false) // Google Sheets senkronizasyon durumu
  const [form] = Form.useForm()
  const [savedPlans, setSavedPlans] = useState([]) // Kaydedilmiş diyet planları
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(false) // Kayıtlı planları yükleme durumu
  const [showPlanDetail, setShowPlanDetail] = useState(false) // Plan detay modal'ı görünürlüğü
  const [currentPlan, setCurrentPlan] = useState(null) // Detayı gösterilen plan
  const [showEditPlanModal, setShowEditPlanModal] = useState(false) // Düzenleme modal'ı görünürlüğü
  const [selectedMealType, setSelectedMealType] = useState('Kahvaltı')
  const [selectedMeals, setSelectedMeals] = useState([])
  const [searchText, setSearchText] = useState('')
  
  // Danışan bilgilerini kontrol et
  const hasSelectedConsultant = Boolean(consultantId) && Boolean(consultantName);

  // Sayfa yüklendiğinde danışanı kontrol et
  useEffect(() => {
    // Eğer seçili danışan yoksa, doğrudan doğrulama bitir
    if (!hasSelectedConsultant) {
      setConsultantVerified(false);
      setVerifying(false);
      return;
    }

    // Danışan var, API kontrolüne gerek yok
    setConsultantVerified(true);
    setVerifying(false);
    
    // Diyet plan ve yemeklerini yükle
    if (hasSelectedConsultant) {
      loadDietPlanFromSheets();
      loadAllSavedPlans();
    }
  }, [hasSelectedConsultant, consultantId, consultantName, consultantEmail]);
  
  // API'den yemek verilerini çek
  useEffect(() => {
    if (hasSelectedConsultant) {
      const fetchMeals = async () => {
        setLoading(true)
        try {
          // SheetBest API ile veri çekmeyi deneyelim
          const response = await axios.get(MEALS_API_URL)
          
          // Debug için raw verileri konsola bas
          console.log('SheetBest Raw Data:', response.data);
          
          if (response.data && Array.isArray(response.data)) {
            // SheetBest verilerini işle
            let foodData = [];
            
            // SheetBest'ten gelen veriyi doğru formata dönüştür
            response.data.forEach((item, index) => {
              // Her bir satırdaki tüm öğün türlerini kontrol et
              if (item.Sabah) {
                foodData.push({
                  key: `breakfast_${index}`,
                  mealType: 'Kahvaltı',
                  name: extractFoodName(item.Sabah),
                  portion: extractPortion(item.Sabah),
                  calories: extractCalories(item.Sabah)
                });
              }
              
              if (item['Öğle']) {
                foodData.push({
                  key: `lunch_${index}`,
                  mealType: 'Öğle Yemeği',
                  name: extractFoodName(item['Öğle']),
                  portion: extractPortion(item['Öğle']),
                  calories: extractCalories(item['Öğle'])
                });
              }
              
              if (item['Akşam']) {
                foodData.push({
                  key: `dinner_${index}`,
                  mealType: 'Akşam Yemeği',
                  name: extractFoodName(item['Akşam']),
                  portion: extractPortion(item['Akşam']),
                  calories: extractCalories(item['Akşam'])
                });
              }
              
              if (item['Ara Öğün']) {
                foodData.push({
                  key: `snack_${index}`,
                  mealType: 'Ara Öğün',
                  name: extractFoodName(item['Ara Öğün']),
                  portion: extractPortion(item['Ara Öğün']),
                  calories: extractCalories(item['Ara Öğün'])
                });
              }
            });
            
            console.log('Processed Food Data:', foodData);
            
            // Boş satırları filtrele
            const validFoodData = foodData.filter(food => food.name && food.name.trim() !== '');
            
            console.log('Valid Food Data:', validFoodData);
            
            if (validFoodData.length > 0) {
              setMeals(validFoodData);
              message.success('Yemek verileri SheetBest\'ten başarıyla yüklendi.');
              
              // Başarılı veriyi localStorage'a kaydet (opsiyonel, ağ bağlantısı yoksa kullanabilmek için)
              localStorage.setItem('mealData', JSON.stringify(validFoodData));
            } else {
              throw new Error('SheetBest\'ten gelen veri boş veya geçersiz format');
            }
          } else {
            throw new Error('API veri formatı beklendiği gibi değil');
          }
        } catch (error) {
          console.error('Veri yükleme hatası:', error);
          message.error('SheetBest bağlantısı başarısız: ' + error.message);
        } finally {
          setLoading(false)
        }
      }

      fetchMeals()
    }
  }, [hasSelectedConsultant]) // hasSelectedConsultant değiştiğinde çalışsın

  // SheetBest veri yapısı için yardımcı fonksiyonlar
  function extractFoodName(text) {
    if (!text) return '';
    
    // Kalori bilgisini ayır
    const calMatch = text.match(/(.*?)\s*\(\d+\s*cal\)$/);
    if (calMatch) return calMatch[1].trim();
    
    // Başka bir formatta kalori varsa
    const calSplit = text.split(/\d+\s*cal/i);
    if (calSplit.length > 1) return calSplit[0].trim();
    
    // Kalori verisi bulunmayan durumlar için
    return text.trim();
  }
  
  function extractPortion(text) {
    if (!text) return '';
    
    // "X adet/gram" gibi miktarları bul
    const portionMatch = text.match(/(\d+\s*(?:adet|g|gram|ml|porsiyon|dilim|fincan|kase|tabak|kaşık|bardak))/i);
    if (portionMatch) return portionMatch[1];
    
    // Parantez içindeki porsiyon bilgisini bul
    const parensMatch = text.match(/\(([\d\s\w]+g?)\)/);
    if (parensMatch) return parensMatch[1];
    
    return '';
  }
  
  function extractCalories(text) {
    if (!text) return 0;
    
    // "XX cal" formatında kalori bilgisini ara
    const match = text.match(/(\d+)\s*cal/i);
    if (match) return parseInt(match[1]);
    
    return 0;
  }

  // Google Sheets'ten diyet planı yükle
  useEffect(() => {
    loadDietPlanFromSheets();
    loadAllSavedPlans();
  }, []);
  
  // Google Sheets'ten diyet planını yükleme
  const loadDietPlanFromSheets = async () => {
    try {
      setSyncing(true);
      
      console.log('Diyet planını yükleme için consultantId:', consultantId, 'consultantName:', consultantName);
      
      // Diyet planlarını API'den çek
      const response = await axios.get(DIET_PLANS_API_URL);
      
      if (response.data && Array.isArray(response.data)) {
        // Danışana ait en son kaydedilmiş diyet planını bul
        const savedPlans = response.data.filter(plan => 
          plan.danisan_id === consultantId && 
          plan.danisan_adi === consultantName && 
          plan.email === consultantEmail // email alanını doğru isimle kullan
        );
        
        console.log('Bulunan diyet planları:', savedPlans);
        
        // En son kaydedilen planı bul 
        const savedPlan = savedPlans.length > 0 ? 
          savedPlans.sort((a, b) => new Date(b.olusturma_tarihi) - new Date(a.olusturma_tarihi))[0] : null;
        
        if (savedPlan) {
          console.log('Yüklenecek diyet planı:', savedPlan);
          
          // Diyet planını işlenebilir yemek listesine dönüştür
          const meals = [];
          
          // Her öğün için regex ile ayrıştırma yap
          const processMenuItems = (menuText, mealType) => {
            // "Belirtilmemiş" ise boş dizi döndür
            if (!menuText || menuText === 'Belirtilmemiş') return [];
            
            const items = menuText.split(', ');
            return items.map((item, index) => {
              // Yemek adı ve kalori değerini ayrıştır
              const nameMatch = item.match(/(.*?)\s*\((\d+)\s*kcal\)$/);
              
              if (nameMatch) {
                const name = nameMatch[1].trim();
                const calories = parseInt(nameMatch[2]);
                
                return {
                  id: `${mealType}_${index}_${Date.now()}`,
                  assignedMealType: mealType,
                  name,
                  calories,
                  portion: '',
                  mealType: mealType
                };
              }
              return null;
            }).filter(item => item !== null); // null değerleri filtrele
          };
          
          // Tüm öğünleri işle ve diyet planına ekle
          const breakfastMeals = processMenuItems(savedPlan.kahvalti, 'Kahvaltı');
          const lunchMeals = processMenuItems(savedPlan.ogle_yemegi, 'Öğle Yemeği');
          const dinnerMeals = processMenuItems(savedPlan.aksam_yemegi, 'Akşam Yemeği');
          const snackMeals = processMenuItems(savedPlan.ara_ogun, 'Ara Öğün');
          
          // Tüm öğünleri birleştir
          const allMeals = [...breakfastMeals, ...lunchMeals, ...dinnerMeals, ...snackMeals];
          
          console.log('İşlenmiş yemek listesi:', allMeals);
          
          // Yemek listesini state'e kaydet
          setSelectedMeals(allMeals);
          
          // Diyet planı bilgisini state'e kaydet
          setDietPlan({
            targetCalories: dailyCalories,
            meals: allMeals,
            totalCalories: savedPlan.toplam_plan_kalorisi
          });
          
          message.success('Kaydedilmiş diyet planı yüklendi');
        }
      }
    } catch (error) {
      console.error('Google Sheets\'ten diyet planı yükleme hatası:', error);
      message.error('Diyet planı yüklenemedi: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };
  
  const mealTypeOptions = [
    { label: 'Kahvaltı', value: 'Kahvaltı' },
    { label: 'Öğle Yemeği', value: 'Öğle Yemeği' },
    { label: 'Akşam Yemeği', value: 'Akşam Yemeği' },
    { label: 'Ara Öğün', value: 'Ara Öğün' },
  ];

  const handleAddMealToDiet = (food) => {
    // Mevcut toplam kaloriyi hesapla
    const currentTotalCalories = selectedMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const newTotalCalories = currentTotalCalories + food.calories;
    
    // Eğer günlük kalori sınırını aşıyorsa uyarı ver ve ekleme
    if (dailyCalories && newTotalCalories > parseInt(dailyCalories)) {
      message.warning(`Bu yemeği eklerseniz günlük kalori sınırını (${dailyCalories} kcal) aşacaksınız!`);
      return;
    }
    
    const newMeal = {
      ...food,
      assignedMealType: food.mealType, // Öğün türünü yemeğin kendi türünden al
      id: Date.now() // benzersiz ID için
    };
    
    setSelectedMeals([...selectedMeals, newMeal]);
    message.success(`${food.name} ${food.mealType} öğününe eklendi`);
  };
  
  const handleRemoveMeal = (mealId) => {
    setSelectedMeals(selectedMeals.filter(meal => meal.id !== mealId));
    message.success('Yemek diyet planından çıkarıldı');
  };
  
  const handleSaveDietPlan = async () => {
    if (selectedMeals.length === 0) {
      message.warning('Lütfen önce yemek ekleyin');
      return;
    }
    
    // Diyet planını görüntülemek için state'e kaydet
    const newDietPlan = {
      targetCalories: dailyCalories,
      meals: selectedMeals
    };
    
    setDietPlan(newDietPlan);
    
    // Diyet planını Google Sheets'e kaydet
    try {
      setSyncing(true);
      
      // Tüm seçili yemekleri konsola yazdır (debug için)
      console.log('Seçilen tüm yemekler:', selectedMeals);
      
      // Yemekleri öğünlere göre grupla ve düzgün biçimde birleştir
      const kahvaltiYemekleri = selectedMeals.filter(m => m.assignedMealType === 'Kahvaltı');
      const ogleYemekleri = selectedMeals.filter(m => m.assignedMealType === 'Öğle Yemeği');
      const aksamYemekleri = selectedMeals.filter(m => m.assignedMealType === 'Akşam Yemeği');
      const araOgunYemekleri = selectedMeals.filter(m => m.assignedMealType === 'Ara Öğün');
      
      console.log('Öğünlere göre gruplandırılmış yemekler:', {
        kahvalti: kahvaltiYemekleri,
        ogle: ogleYemekleri,
        aksam: aksamYemekleri,
        araOgun: araOgunYemekleri
      });
      
      // Öğünleri formatla
      const formatMeals = (meals) => {
        if (meals.length === 0) return 'Belirtilmemiş';
        return meals.map(m => `${m.name} (${m.calories} kcal)`).join(', ');
      };
      
      const kahvaltiItems = formatMeals(kahvaltiYemekleri);
      const ogleItems = formatMeals(ogleYemekleri);
      const aksamItems = formatMeals(aksamYemekleri);
      const araOgunItems = formatMeals(araOgunYemekleri);
      
      // Google Sheets'e kaydedilecek veriyi hazırla
      const planData = {
        danisan_id: consultantId,
        danisan_adi: consultantName,
        email: consultantEmail,
        gunluk_kalori: dailyCalories,
        toplam_plan_kalorisi: selectedMeals.reduce((sum, meal) => sum + meal.calories, 0),
        kahvalti: kahvaltiItems,
        ogle_yemegi: ogleItems,
        aksam_yemegi: aksamItems,
        ara_ogun: araOgunItems,
        olusturma_tarihi: new Date().toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) // Tarih ve saati Türkçe formatında kaydet
      };
      
      console.log('Google Sheets\'e kaydedilecek veri:', planData);
      
      // SheetBest API'ye POST isteği gönder
      const response = await axios.post(DIET_PLANS_API_URL, planData);
      
      if (response.status === 200) {
        message.success('Diyet planı başarıyla kaydedildi.');
        console.log('Google Sheets yanıtı:', response.data);
        
        // Kaydedilen planları yeniden yükle
        loadAllSavedPlans();
        
        // Seçilen yemekler listesini temizle
        setSelectedMeals([]);
      } else {
        throw new Error('API yanıtı başarısız: ' + response.status);
      }
    } catch (error) {
      console.error('Google Sheets kayıt hatası:', error);
      message.error('Diyet planı kaydedilemedi: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Yemek tablosu sütunları
  const foodColumns = [
    { 
      title: 'Öğün',
      dataIndex: 'mealType',
      key: 'mealType',
      align: 'center',
      filters: [
        { text: 'Kahvaltı', value: 'Kahvaltı' },
        { text: 'Öğle Yemeği', value: 'Öğle Yemeği' },
        { text: 'Akşam Yemeği', value: 'Akşam Yemeği' },
        { text: 'Ara Öğün', value: 'Ara Öğün' },
      ],
      onFilter: (value, record) => record.mealType === value,
      filterMultiple: true, // Birden fazla öğün türü filtrelemesine izin ver
      defaultFilteredValue: [], // Başlangıçta hiçbir filtre seçili değil
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    { 
      title: 'Yemek Adı',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      sorter: (a, b) => a.name.localeCompare(b.name), // İsme göre sıralama
    },
    { 
      title: 'Porsiyon',
      dataIndex: 'portion',
      key: 'portion',
      align: 'center',
    },
    { 
      title: 'Kalori',
      dataIndex: 'calories',
      key: 'calories',
      align: 'center',
      sorter: (a, b) => a.calories - b.calories, // Kaloriye göre sıralama
      render: (calories) => `${calories} kcal`
    },
    {
      title: 'İşlemler',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          onClick={() => handleAddMealToDiet(record)} 
          icon={<ScheduleOutlined />} 
          size="small"
        >
          Ekle
        </Button>
      )
    }
  ];
  
  // Seçilen yemekler tablosu sütunları
  const selectedMealsColumns = [
    { 
      title: 'Öğün',
      dataIndex: 'assignedMealType',
      key: 'assignedMealType',
      align: 'center',
      filters: [
        { text: 'Kahvaltı', value: 'Kahvaltı' },
        { text: 'Öğle Yemeği', value: 'Öğle Yemeği' },
        { text: 'Akşam Yemeği', value: 'Akşam Yemeği' },
        { text: 'Ara Öğün', value: 'Ara Öğün' },
      ],
      onFilter: (value, record) => record.assignedMealType === value,
      render: (text) => <Tag color="green">{text}</Tag>
    },
    { 
      title: 'Yemek Adı',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
    },
    { 
      title: 'Porsiyon',
      dataIndex: 'portion',
      key: 'portion',
      align: 'center',
    },
    { 
      title: 'Kalori',
      dataIndex: 'calories',
      key: 'calories',
      align: 'center',
      render: (calories) => `${calories} kcal`
    },
    {
      title: 'İşlemler',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          danger
          onClick={() => handleRemoveMeal(record.id)} 
          size="small"
        >
          Çıkar
        </Button>
      )
    }
  ];

  // Filtrelenmiş yemekler
  const filteredMeals = meals.filter(meal => 
    meal.name.toLowerCase().includes(searchText.toLowerCase()) ||
    meal.mealType.toLowerCase().includes(searchText.toLowerCase())
  );

  // Toplam kalori hesaplama
  const totalCalories = selectedMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const calorieTarget = parseInt(dailyCalories) || 0;
  const caloriePercentage = calorieTarget > 0 ? Math.round((totalCalories / calorieTarget) * 100) : 0;

  // Tüm diyet planlarını yükle
  const loadAllSavedPlans = async () => {
    try {
      setLoadingSavedPlans(true);
      
      // Tüm diyet planlarını çek
      const response = await axios.get(DIET_PLANS_API_URL);
      
      if (response.data && Array.isArray(response.data)) {
        // Bu danışana ait planları filtrele
        const filteredPlans = response.data.filter(plan => 
          plan.danisan_id === consultantId && 
          plan.danisan_adi === consultantName &&
          plan.email === consultantEmail
        );
        
        if (filteredPlans.length > 0) {
          setSavedPlans(filteredPlans);
        }
      }
    } catch (error) {
      console.error('Google Sheets\'ten diyet planları yüklenemedi:', error);
      message.error('Diyet planları yüklenemedi: ' + error.message);
    } finally {
      setLoadingSavedPlans(false);
    }
  };
  
  // Kaydedilmiş diyet planını sil
  const handleDeletePlan = async (plan) => {
    try {
      setSyncing(true);
      
      console.log('Silinecek plan:', plan);
      
      try {
        // 3. YÖNTEM: Planın indeksini bul ve doğrudan indekse göre sil
        // Önce tüm diyet planlarını getir
        const response = await axios.get(DIET_PLANS_API_URL);
        
        if (response.data && Array.isArray(response.data)) {
          // Silinecek planın indeksini bul (0 tabanlı indeks)
          const planIndex = response.data.findIndex(item => 
            item.email === plan.email && 
            item.olusturma_tarihi === plan.olusturma_tarihi
          );
          
          console.log('Bulunan plan indeksi:', planIndex);
          
          if (planIndex !== -1) {
            // Satır numarasını URL'ye ekleyerek silme işlemi yap
            // SheetBest API'nin belgeleri, direkt indeks numarası ile silme yapılabileceğini belirtiyor
            const deleteUrl = `${DIET_PLANS_API_URL}/${planIndex}`;
            console.log('Silme URL:', deleteUrl);
            
            const deleteResponse = await axios.delete(deleteUrl);
            console.log('Silme yanıtı:', deleteResponse);
            
            if (deleteResponse.status === 200) {
              // UI'daki listeyi güncelle
              setSavedPlans(prevPlans => prevPlans.filter(p => 
                p.email !== plan.email || 
                p.olusturma_tarihi !== plan.olusturma_tarihi
              ));
              message.success('Diyet planı başarıyla silindi');
              return; // İşlem başarılı oldu, fonksiyondan çık
            }
          }
        }
        // Bu noktaya gelirsek, indeks temelli silme başarısız olmuştur
        throw new Error('İndeks temelli silme başarısız oldu');
      } catch (indexMethodError) {
        console.error('İndeks temelli silme hatası:', indexMethodError);
        
        // 4. YÖNTEM: axios yapılandırmasını kullanarak silme işlemi
        try {
          console.log('4. Yöntem deneniyor: axios yapılandırması ile silme');
          
          // API isteğini gönder (axios yapılandırması ile)
          const deleteResponse = await axios({
            method: 'DELETE',
            url: `${DIET_PLANS_API_URL}/query`,
            params: {
              email: plan.email || '',
              olusturma_tarihi: plan.olusturma_tarihi || ''
            },
            // Content-Type: application/json header'ı ekle
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('4. Yöntem yanıtı:', deleteResponse);
          
          if (deleteResponse.status === 200) {
            // UI'daki listeyi güncelle
            setSavedPlans(prevPlans => prevPlans.filter(p => 
              p.email !== plan.email || 
              p.olusturma_tarihi !== plan.olusturma_tarihi
            ));
            message.success('Diyet planı başarıyla silindi');
          } else {
            throw new Error('API yanıtı başarısız: ' + deleteResponse.status);
          }
        } catch (axiosConfigMethodError) {
          console.error('4. Yöntem hatası:', axiosConfigMethodError);
          
          // Hata durumunda orijinal hatayı gösterelim
          throw indexMethodError;
        }
      }
    } catch (error) {
      console.error('Google Sheets silme hatası:', error);
      message.error('Diyet planı silinemedi: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };
  
  // Plan detayını göster
  const showPlanDetails = (plan) => {
    setCurrentPlan(plan);
    setShowPlanDetail(true);
  };
  
  // Kaydedilmiş diyet planını e-posta ile gönder
  const handleSendEmail = async (plan) => {
    try {
      const emailLoading = message.loading('E-posta gönderiliyor...', 0);
      
      console.log('E-posta gönderilecek plan:', plan);
      
      // Danışan bilgilerini Google Sheets'ten çek
      let consultantDetails = null;
      try {
        // Dashboard.jsx'de kullanılan API endpointi
        const CONSULTANTS_API_URL = 'https://api.sheetbest.com/sheets/2a23f751-7844-44e6-a195-39fdfc3f6b21/tabs/Danışanlar';
        
        // Danışanlar tablosundan e-posta adresi eşleşen danışanı bul
        const consultantsResponse = await axios.get(CONSULTANTS_API_URL);
        
        if (consultantsResponse.data && Array.isArray(consultantsResponse.data)) {
          // E-posta adresine göre danışanı bul
          const consultant = consultantsResponse.data.find(c => 
            c.email && c.email.toLowerCase() === (plan.email || '').toLowerCase()
          );
          
          if (consultant) {
            consultantDetails = {
              name: consultant.ad_soyad,
              email: consultant.email,
              age: consultant.yas,
              height: consultant.boy,
              weight: consultant.kilo,
              gender: consultant.cinsiyet,
              activity: consultant.aktivite,
              bmi: consultant.vki,
              bmiCategory: consultant.vki_durumu,
              dailyCalories: consultant.gunluk_kalori
            };
            console.log('Danışan detayları bulundu:', consultantDetails);
          }
        }
      } catch (consultantError) {
        console.error('Danışan bilgisi çekme hatası:', consultantError);
        // Hata olsa bile e-posta gönderme işlemine devam et, sadece danışan detayları olmayacak
      }
      
      // Plan içeriğini hazırla
      const kahvalti = plan.kahvalti || 'Belirtilmemiş';
      const ogleYemegi = plan.ogle_yemegi || 'Belirtilmemiş';
      const aksamYemegi = plan.aksam_yemegi || 'Belirtilmemiş';
      const araOgun = plan.ara_ogun || 'Belirtilmemiş';
      
      // Tarih formatını hazırla
      const formattedDate = (() => {
        try {
          // Eğer tarih zaten formatlanmış ise (örn: "26 Temmuz 2023, 15:30"), doğrudan göster
          if (typeof plan.olusturma_tarihi === 'string' && plan.olusturma_tarihi.includes(':')) {
            return plan.olusturma_tarihi;
          }
          // Aksi takdirde, tarihi formatla
          return new Date(plan.olusturma_tarihi).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          return plan.olusturma_tarihi; // Hata durumunda orijinal değeri göster
        }
      })();
      
      // Danışan bilgilerini içeren kısım
      const consultantInfoHTML = consultantDetails ? `
        <h3>Danışan Bilgileri</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="width: 30%;"><strong>Ad Soyad:</strong></td>
            <td>${consultantDetails.name}</td>
          </tr>
          <tr>
            <td><strong>Yaş:</strong></td>
            <td>${consultantDetails.age}</td>
          </tr>
          <tr>
            <td><strong>Boy:</strong></td>
            <td>${consultantDetails.height} cm</td>
          </tr>
          <tr>
            <td><strong>Kilo:</strong></td>
            <td>${consultantDetails.weight} kg</td>
          </tr>
          <tr>
            <td><strong>Cinsiyet:</strong></td>
            <td>${consultantDetails.gender}</td>
          </tr>
          <tr>
            <td><strong>Aktivite Seviyesi:</strong></td>
            <td>${consultantDetails.activity}</td>
          </tr>
          <tr>
            <td><strong>VKİ:</strong></td>
            <td>${consultantDetails.bmi}</td>
          </tr>
          <tr>
            <td><strong>VKİ Durumu:</strong></td>
            <td>${consultantDetails.bmiCategory}</td>
          </tr>
        </table>
      ` : '';
      
      const consultantInfoText = consultantDetails ? `
Danışan Bilgileri:
Ad Soyad: ${consultantDetails.name}
Yaş: ${consultantDetails.age}
Boy: ${consultantDetails.height} cm
Kilo: ${consultantDetails.weight} kg
Cinsiyet: ${consultantDetails.gender}
Aktivite Seviyesi: ${consultantDetails.activity}
VKİ: ${consultantDetails.bmi}
VKİ Durumu: ${consultantDetails.bmiCategory}
` : '';
      
      // E-posta HTML içeriğini hazırla
      const emailContent = `
        <h2>${plan.danisan_adi} için Diyet Planı</h2>
        <p><strong>Tarih:</strong> ${formattedDate}</p>
        
        ${consultantInfoHTML}
        
        <h3>Diyet Plan Bilgileri</h3>
        <p><strong>Günlük Kalori İhtiyacı:</strong> ${plan.gunluk_kalori} kcal</p>
        <p><strong>Toplam Plan Kalorisi:</strong> ${plan.toplam_plan_kalorisi} kcal</p>
        
        <h3>Kahvaltı</h3>
        <p>${kahvalti}</p>
        
        <h3>Öğle Yemeği</h3>
        <p>${ogleYemegi}</p>
        
        <h3>Akşam Yemeği</h3>
        <p>${aksamYemegi}</p>
        
        <h3>Ara Öğün</h3>
        <p>${araOgun}</p>
      `;
      
      // Basit bir metin içeriği oluştur (mailto için)
      const plainTextContent = `
Merhaba ${plan.danisan_adi},

İşte diyet planınız:

Tarih: ${formattedDate}

${consultantInfoText}

Diyet Plan Bilgileri:
Günlük Kalori İhtiyacı: ${plan.gunluk_kalori} kcal
Toplam Plan Kalorisi: ${plan.toplam_plan_kalorisi} kcal

Kahvaltı:
${kahvalti}

Öğle Yemeği:
${ogleYemegi}

Akşam Yemeği:
${aksamYemegi}

Ara Öğün:
${araOgun}
      `;
      
      // E-posta konusu
      const subject = `${plan.danisan_adi} için Diyet Planı`;
      
      // Varsayılan e-posta istemcisini açmak için mailto URL'i oluştur
      const mailtoUrl = `mailto:${plan.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextContent)}`;
      
      // Kullanıcıya e-posta gönderme yöntemini seçmesi için sor
      Modal.confirm({
        title: 'E-posta Gönderme Yöntemi',
        content: 'Diyet planını nasıl göndermek istersiniz?',
        okText: 'Varsayılan E-posta Uygulaması',
        cancelText: 'İptal',
        onOk() {
          // Varsayılan e-posta istemcisini aç
          window.open(mailtoUrl);
          message.success('E-posta uygulaması açılıyor...');
          emailLoading();
        },
        onCancel() {
          emailLoading();
          message.info('E-posta gönderimi iptal edildi');
        }
      });
    } catch (error) {
      console.error('E-posta gönderme hatası:', error);
      message.error('E-posta gönderilemedi: ' + error.message);
    }
  };
  
  // Kaydedilmiş planların sütun tanımlamaları
  const savedPlansColumns = [
    {
      title: 'Toplam Kalori',
      dataIndex: 'toplam_plan_kalorisi',
      key: 'toplam_plan_kalorisi',
      align: 'center',
      render: calories => <Tag color="orange">{calories} kcal</Tag>
    },
    {
      title: 'Günlük Kalori İhtiyacı',
      dataIndex: 'gunluk_kalori',
      key: 'gunluk_kalori',
      align: 'center',
      render: calories => <Tag color="blue">{calories} kcal</Tag>
    },
    {
      title: 'İşlemler',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary"
            size="small"
            icon={<FireOutlined />}
            onClick={() => showPlanDetails(record)}
          >
            Detay
          </Button>
          <Button
            type="primary"
            size="small"
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            icon={<MailOutlined />}
            onClick={() => handleSendEmail(record)}
            disabled={!record.email}
          >
            E-posta Gönder
          </Button>
          <Popconfirm
            title="Diyet planını silmek istediğinize emin misiniz?"
            onConfirm={() => handleDeletePlan(record)}
            okText="Evet"
            cancelText="İptal"
          >
            <Button 
              type="primary" 
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Sil
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Render edilecek içerik için ana koşul
  const renderConsultantWarning = () => (
    <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none', textAlign: 'center', padding: '40px 0' }}>
      <FireOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 24 }} />
      <Title level={3}>Lütfen önce bir danışan seçin</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Diyet planı oluşturmak için Danışman Bilgileri sayfasından bir danışan seçmeniz gerekmektedir.
      </Text>
      <Text type="danger" style={{ display: 'block', marginBottom: 24 }}>
        Hata: Danışan bilgileri bulunamadı veya seçili danışan yok.
      </Text>
      <div style={{ marginTop: 24 }}>
        <Button type="primary" size="large" onClick={() => navigate('/dashboard')}>
          Danışman Bilgileri Sayfasına Dön
        </Button>
      </div>
    </Card>
  )
  
  // Yükleme göstergesi
  const renderLoading = () => (
    <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none', textAlign: 'center', padding: '40px 0' }}>
      <Spin size="large" />
      <Title level={3} style={{ marginTop: 24 }}>Danışan bilgileri kontrol ediliyor...</Title>
      <Text type="secondary">
        Lütfen bekleyin, danışan bilgilerinin geçerliliği doğrulanıyor.
      </Text>
    </Card>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navbar />
      <Layout>
        <Sider width={200} style={{ background: '#001529' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['2']}
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
            {verifying ? (
              // Yükleme durumu
              renderLoading()
            ) : !hasSelectedConsultant ? (
              // Danışan seçili değil
              renderConsultantWarning()
            ) : (
              // Danışan seçili, normal içerik göster
              <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none', marginBottom: 24 }}>
                <Title level={3} style={{ marginBottom: 16 }}>
                  {consultantName} için Diyet Planı
                </Title>
                
                <Descriptions title="Danışan Bilgileri" bordered>
                  <Descriptions.Item label="Günlük Kalori İhtiyacı" span={3}>
                    <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                      <FireOutlined style={{ marginRight: 8 }} />
                      {dailyCalories} kcal
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
                
                <Tabs defaultActiveKey="1" style={{ marginTop: 24 }}>
                  <TabPane tab="Diyet Planı Oluştur" key="1">
                    <div style={{ marginTop: 16 }}>
                      <Title level={4}>Seçilen Yemekler</Title>
                      
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          {/* Bu alanı kaldırarak öğün seçim dropdown'unu kaldırıyoruz */}
                        </div>
                        
                        <div>
                          <Progress
                            type="circle"
                            percent={caloriePercentage}
                            status={caloriePercentage > 100 ? 'exception' : 'normal'}
                            format={() => `${totalCalories}/${calorieTarget}`}
                            width={80}
                            style={{ marginRight: 16 }}
                          />
                          
                          <Button 
                            type="primary" 
                            onClick={handleSaveDietPlan}
                            disabled={selectedMeals.length === 0}
                            style={{ marginRight: 8 }}
                            loading={syncing}
                          >
                            Diyet Planını Kaydet
                          </Button>
                          
                          {consultantEmail && (
                            <Button
                              type="primary"
                              style={{ background: '#52c41a', borderColor: '#52c41a', marginRight: 8 }}
                              icon={<MailOutlined />}
                              onClick={() => {
                                // Şu anki seçili yemekleri kullanarak diyet planı oluştur
                                const emailPlan = {
                                  danisan_id: consultantId,
                                  danisan_adi: consultantName,
                                  danisan_email: consultantEmail,
                                  gunluk_kalori: dailyCalories,
                                  toplam_plan_kalorisi: selectedMeals.reduce((sum, meal) => sum + meal.calories, 0),
                                  kahvalti: selectedMeals.filter(m => m.assignedMealType === 'Kahvaltı')
                                    .map(m => `${m.name} (${m.calories} kcal)`).join(', ') || 'Belirtilmemiş',
                                  ogle_yemegi: selectedMeals.filter(m => m.assignedMealType === 'Öğle Yemeği')
                                    .map(m => `${m.name} (${m.calories} kcal)`).join(', ') || 'Belirtilmemiş',
                                  aksam_yemegi: selectedMeals.filter(m => m.assignedMealType === 'Akşam Yemeği')
                                    .map(m => `${m.name} (${m.calories} kcal)`).join(', ') || 'Belirtilmemiş',
                                  ara_ogun: selectedMeals.filter(m => m.assignedMealType === 'Ara Öğün')
                                    .map(m => `${m.name} (${m.calories} kcal)`).join(', ') || 'Belirtilmemiş',
                                  olusturma_tarihi: new Date().toLocaleDateString('tr-TR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                };
                                handleSendEmail(emailPlan);
                              }}
                              disabled={selectedMeals.length === 0}
                            >
                              Diyet Planını E-posta Olarak Gönder
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <Table
                        columns={selectedMealsColumns}
                        dataSource={selectedMeals}
                        rowKey="id"
                        pagination={false}
                        locale={{ emptyText: 'Henüz yemek seçilmedi' }}
                        summary={() => (
                          <Table.Summary>
                            <Table.Summary.Row>
                              <Table.Summary.Cell index={0} colSpan={3} align="right">
                                <Text strong>Toplam Kalori:</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={1} align="center">
                                <Text strong>{totalCalories} kcal</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2} />
                            </Table.Summary.Row>
                          </Table.Summary>
                        )}
                      />
                    </div>
                    
                    <Card 
                      title={<Title level={4} style={{ margin: 0 }}>Tüm Yemekler</Title>}
                      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: 'none', marginTop: 24 }} 
                      extra={<Text type="secondary">Seçmek istediğiniz yemeğin yanındaki "Ekle" butonuna tıklayın</Text>}
                    >
                      {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <Spin size="large" />
                          <div style={{ marginTop: 16 }}>Yemekler yükleniyor...</div>
                        </div>
                      ) : (
                        <>
                          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                            <Input.Search 
                              placeholder="Yemek adı veya öğün ara..." 
                              allowClear
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              onSearch={setSearchText}
                              style={{ width: 300 }}
                            />
                            <div style={{ marginLeft: 16 }}>
                              <Text type="secondary">
                                Toplam {filteredMeals.length} yemek listeleniyor
                                {searchText && ` "${searchText}" araması için`}
                              </Text>
                            </div>
                          </div>
                          <Table 
                            columns={foodColumns} 
                            dataSource={filteredMeals} 
                            rowKey="key"
                            pagination={{ 
                              pageSize: 10,
                              showSizeChanger: true, 
                              pageSizeOptions: ['5', '10', '20', '50'],
                              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} yemek`
                            }}
                            bordered
                            style={{ marginTop: 16 }}
                          />
                        </>
                      )}
                    </Card>
                  </TabPane>
                  
                  <TabPane tab="Kaydedilmiş Planlar" key="2">
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0 }}>Kaydedilen Diyet Planları</Title>
                        <Button 
                          type="primary" 
                          icon={<HistoryOutlined />} 
                          onClick={loadAllSavedPlans} 
                          loading={loadingSavedPlans}
                        >
                          Planları Yenile
                        </Button>
                      </div>
                      
                      {loadingSavedPlans ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <Spin size="large" />
                          <div style={{ marginTop: 16 }}>Diyet planları yükleniyor...</div>
                        </div>
                      ) : (
                        <Table
                          columns={savedPlansColumns}
                          dataSource={savedPlans}
                          rowKey={(record) => record.olusturma_tarihi}
                          pagination={false}
                          locale={{ emptyText: 'Henüz kaydedilmiş diyet planı bulunmuyor' }}
                          style={{ marginTop: 16 }}
                        />
                      )}
                    </div>
                  </TabPane>
                </Tabs>
              </Card>
            )}
          </Content>
        </Layout>
      </Layout>
      
      {/* Plan Detay Modal */}
      <Modal
        title={`${currentPlan?.danisan_adi || 'Danışan'} için Diyet Planı Detayı`}
        visible={showPlanDetail}
        onCancel={() => setShowPlanDetail(false)}
        width={800}
        footer={[
          <Button 
            key="email" 
            type="primary" 
            icon={<MailOutlined />} 
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => currentPlan && handleSendEmail(currentPlan)}
            disabled={!currentPlan?.email}
          >
            E-posta Gönder
          </Button>,
          <Button key="back" onClick={() => setShowPlanDetail(false)}>
            Kapat
          </Button>
        ]}
      >
        {currentPlan && (
          <div>
            <Descriptions title="Plan Bilgileri" bordered style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Günlük Kalori İhtiyacı">
                <Tag color="blue">{currentPlan.gunluk_kalori} kcal</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Toplam Plan Kalorisi">
                <Tag color="orange">{currentPlan.toplam_plan_kalorisi} kcal</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Doluluk Oranı">
                <Progress 
                  percent={Math.round((currentPlan.toplam_plan_kalorisi / currentPlan.gunluk_kalori) * 100)} 
                  status={(currentPlan.toplam_plan_kalorisi > currentPlan.gunluk_kalori) ? 'exception' : 'normal'} 
                />
              </Descriptions.Item>
            </Descriptions>
            
            <Title level={4} style={{ marginBottom: 16 }}>Öğünlere Göre Diyet Planı</Title>
            
            <Card 
              title={<span style={{ fontWeight: 'bold', color: '#1890ff' }}>Kahvaltı</span>} 
              style={{ marginBottom: 16 }} 
              bodyStyle={{ border: 0 }}
              type="inner"
            >
              <Text>{currentPlan.kahvalti || 'Belirtilmemiş'}</Text>
            </Card>
            
            <Card 
              title={<span style={{ fontWeight: 'bold', color: '#52c41a' }}>Öğle Yemeği</span>} 
              style={{ marginBottom: 16 }} 
              bodyStyle={{ border: 0 }}
              type="inner"
            >
              <Text>{currentPlan.ogle_yemegi || 'Belirtilmemiş'}</Text>
            </Card>
            
            <Card 
              title={<span style={{ fontWeight: 'bold', color: '#722ed1' }}>Akşam Yemeği</span>} 
              style={{ marginBottom: 16 }} 
              bodyStyle={{ border: 0 }}
              type="inner"
            >
              <Text>{currentPlan.aksam_yemegi || 'Belirtilmemiş'}</Text>
            </Card>
            
            <Card 
              title={<span style={{ fontWeight: 'bold', color: '#fa8c16' }}>Ara Öğün</span>} 
              bodyStyle={{ border: 0 }}
              type="inner"
            >
              <Text>{currentPlan.ara_ogun || 'Belirtilmemiş'}</Text>
            </Card>
          </div>
        )}
      </Modal>
    </Layout>
  )
} 