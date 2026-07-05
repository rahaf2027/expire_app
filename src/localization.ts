/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  appDescription: string;
  branch: string;
  branchSelect: string;
  createBranch: string;
  branchPlaceholder: string;
  activeEmployee: string;
  employeePlaceholder: string;
  registerProduct: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  uploadPhoto: string;
  snapPhoto: string;
  useSample: string;
  analyzing: string;
  dateFallbackLabel: string;
  dateSuccessLabel: string;
  datePlaceholder: string;
  confirmProduct: string;
  duplicateTitle: string;
  duplicateDesc: string;
  duplicateCompareOld: string;
  duplicateCompareNew: string;
  btnSameProduct: string;
  btnDifferentFlavor: string;
  filterAll: string;
  filterToday: string;
  filterTomorrow: string;
  filter2Days: string;
  filter1Week: string;
  filterDuplicates: string;
  colProduct: string;
  colLanguages: string;
  colExpiry: string;
  colCountdown: string;
  colQuantity: string;
  colActions: string;
  actionSold: string;
  actionChecked: string;
  actionHandled: string;
  actionCreated: string;
  actionIncremented: string;
  logTitle: string;
  logEmpty: string;
  logFormat: string;
  notifTitle: string;
  notifSetting: string;
  notifTimeLabel: string;
  notifBtnTest: string;
  notifSampleToast: string;
  statsTitle: string;
  statsExpired: string;
  statsWarning: string;
  statsSafe: string;
  statsTotal: string;
  badgeDaysLeft: string;
  badgeDayLeft: string;
  badgeToday: string;
  badgeTomorrow: string;
  badgeExpired: string;
  simulationMode: string;
  simulationAlert: string;
  cancel: string;
  addQuantity: string;
  actionEdit: string;
  editProductTitle: string;
  editProductDesc: string;
  saveChanges: string;
  unitPiece: string;
  unitCarton: string;
  cartonCountLabel: string;
  itemsPerCartonLabel: string;
  looseItemsLabel: string;
  totalCalculatedLabel: string;
  btnEnterDateManually: string;
  dateManualPlaceholder: string;
  duplicateSeparateAlert: string;
  duplicateBadge: string;
  errorSelectExpiryDate: string;
  stepHeader1: string;
  stepHeader2: string;
  stepHeader3: string;
}

export const localization: Record<string, Translations> = {
  ar: {
    appTitle: "تتبع الصلاحية الذكي",
    appSubtitle: "Smart Expiry Tracker",
    appDescription: "نظام إدارة تواريخ الصلاحية الذكي المعتمد على الذكاء الاصطناعي وبطاقات الفحص اليومي للفروع والمخازن.",
    branch: "الفرع",
    branchSelect: "اختر الفرع الحالي",
    createBranch: "إنشاء فرع جديد",
    branchPlaceholder: "اسم الفرع الجديد...",
    activeEmployee: " الموظف النشط",
    employeePlaceholder: "اكتب اسمك لتسجيل الإجراءات...",
    registerProduct: "تسجيل منتج جديد (صورة مزدوجة)",
    step1Title: "الخطوة الأولى: غلاف المنتج",
    step1Desc: "التقط صورة لغلاف المنتج الخارجي لاستخراج الاسم والماركة بعدة لغات.",
    step2Title: "الخطوة الثانية: تاريخ الصلاحية",
    step2Desc: "التقط صورة لتاريخ الصلاحية المطبوع للاستخراج التلقائي.",
    step3Title: "الخطوة الثالثة: مراجعة البيانات المستخرجة",
    uploadPhoto: "رفع صورة",
    snapPhoto: "التقاط بالكاميرا",
    useSample: "تجربة بالعينات",
    analyzing: "جاري تحليل الصورة بالذكاء الاصطناعي...",
    dateFallbackLabel: "تعذر قراءة التاريخ؟ أدخله يدوياً:",
    dateSuccessLabel: "تم استخراج تاريخ انتهاء الصلاحية بنجاح:",
    datePlaceholder: "اختر تاريخ انتهاء الصلاحية",
    confirmProduct: "تأكيد وحفظ المنتج",
    duplicateTitle: "تنبيه ذكي: هذا المنتج مسجل بالفعل بنفس التاريخ!",
    duplicateDesc: "تم العثور على منتج مطابق في قاعدة البيانات. يرجى المقارنة البصرية لتمييز النكهات والتكرار.",
    duplicateCompareOld: "الصورة المسجلة مسبقاً",
    duplicateCompareNew: "الصورة الجديدة المُلتقطة",
    btnSameProduct: "نفس المنتج تماماً (زيادة الكمية)",
    btnDifferentFlavor: "منتج / نكهة مختلفة (حفظ كعنصر مستقل)",
    filterAll: "الكل",
    filterToday: "ينتهي اليوم",
    filterTomorrow: "ينتهي غداً",
    filter2Days: "ينتهي خلال يومين",
    filter1Week: "ينتهي خلال أسبوع",
    filterDuplicates: "المنتجات المكررة",
    colProduct: "المنتج",
    colLanguages: "الاسم باللغات الأصلية",
    colExpiry: "تاريخ الانتهاء",
    colCountdown: "الوقت المتبقي",
    colQuantity: "الكمية",
    colActions: "إجراء سريع",
    actionSold: "تم البيع",
    actionChecked: "فحص الرف",
    actionHandled: "تم التعامل",
    actionCreated: "تم تسجيله",
    actionIncremented: "تم زيادة الكمية",
    logTitle: "سجل العمليات اليومية للفرع",
    logEmpty: "لا توجد عمليات مسجلة اليوم.",
    logFormat: "تم الإجراء بواسطة الموظف: {employee} - الساعة {time}",
    notifTitle: "نظام التنبيهات اليومي الذكي",
    notifSetting: "إعدادات وقت التنبيه",
    notifTimeLabel: "وقت التنبيه الصباحي للدورية:",
    notifBtnTest: "محاكاة إنذار الدورية الصباحية",
    notifSampleToast: "تنبيه يومي: يوجد اليوم {count} منتجات تقترب من تاريخ انتهاء صلاحيتها، يرجى مراجعة قائمة الفحص الفوري.",
    statsTitle: "ملخص حالة الرفوف",
    statsExpired: "منتهي الصلاحية",
    statsWarning: "حرج (أقل من 3 أيام)",
    statsSafe: "آمن (أكثر من أسبوع)",
    statsTotal: "إجمالي المنتجات",
    badgeDaysLeft: "متبقي {days} يوم",
    badgeDayLeft: "متبقي يوم واحد",
    badgeToday: "ينتهي اليوم!",
    badgeTomorrow: "ينتهي غداً!",
    badgeExpired: "منتهي!",
    simulationMode: "وضعية المحاكاة التفاعلية نشطة لمساعدتك على تجربة جميع الميزات فورياً.",
    simulationAlert: "تنبيه: يتم معالجة الصور محلياً مع دعم كامل للذكاء الاصطناعي.",
    cancel: "إلغاء",
    addQuantity: "زيادة الكمية",
    actionEdit: "تعديل",
    editProductTitle: "تعديل بيانات المنتج",
    editProductDesc: "تعديل تفاصيل المنتج والكمية وتاريخ الصلاحية يدوياً.",
    saveChanges: "حفظ التغييرات",
    unitPiece: "قطعة",
    unitCarton: "كرتون",
    cartonCountLabel: "عدد الكراتين",
    itemsPerCartonLabel: "القطع داخل الكرتونة",
    looseItemsLabel: "القطع الفردية الزائدة (إن وجدت)",
    totalCalculatedLabel: "إجمالي الكمية بالقطع",
    btnEnterDateManually: "إدخال التاريخ يدوياً",
    dateManualPlaceholder: "يوم/شهر/سنة (مثال: 25/09/2025)",
    duplicateSeparateAlert: "⚠️ هذا المنتج متطابق تماماً في الاسم والماركة والتاريخ مع منتج مضاف بالفعل. لحفظه كمنتج منفصل، يرجى إغلاق هذه النافذة وتغيير الاسم أولاً في الحقل النصي (مثال: توضيح النكهة أو الشكل المختلف) لتجنب التكرار العشوائي!",
    duplicateBadge: "تنبيه: مكرر",
    errorSelectExpiryDate: "⚠️ يرجى اختيار تاريخ الصلاحية للمنتج!",
    stepHeader1: "الغلاف والاسم",
    stepHeader2: "تاريخ الصلاحية",
    stepHeader3: "التأكيد والحفظ"
  },
  en: {
    appTitle: "Smart Expiry Tracker",
    appSubtitle: "Expiry Date Management Tool",
    appDescription: "AI-powered product expiry date tracking tool and dynamic daily check-sheets for retail branches.",
    branch: "Branch",
    branchSelect: "Select Active Branch",
    createBranch: "Create New Branch",
    branchPlaceholder: "New branch name...",
    activeEmployee: "Active Employee",
    employeePlaceholder: "Enter your name to log actions...",
    registerProduct: "Register New Product (Dual Photo)",
    step1Title: "Step 1: Product Packaging",
    step1Desc: "Capture product packaging to extract name & brand in multiple languages.",
    step2Title: "Step 2: Expiry Date",
    step2Desc: "Capture printed expiry date for automatic date extraction.",
    step3Title: "Step 3: Review Extracted Data",
    uploadPhoto: "Upload Photo",
    snapPhoto: "Snap Photo",
    useSample: "Use Sample",
    analyzing: "AI Analyzing image via Gemini...",
    dateFallbackLabel: "Unreadable date? Enter manually:",
    dateSuccessLabel: "Expiry date extracted successfully:",
    datePlaceholder: "Select expiry date",
    confirmProduct: "Confirm & Save Product",
    duplicateTitle: "Smart Alert: This product is already registered with this date!",
    duplicateDesc: "A matching product and date exists. Please compare visually to distinguish flavors or duplicates.",
    duplicateCompareOld: "Previously Registered Image",
    duplicateCompareNew: "Newly Captured Image",
    btnSameProduct: "Same Product Exactly (Add Quantity)",
    btnDifferentFlavor: "Different Product/Flavor (Save Separately)",
    filterAll: "All",
    filterToday: "Expires Today",
    filterTomorrow: "Expires Tomorrow",
    filter2Days: "Expires in 2 Days",
    filter1Week: "Expires in 1 Week",
    filterDuplicates: "Duplicate Products",
    colProduct: "Product",
    colLanguages: "Original Multilingual Names",
    colExpiry: "Expiry Date",
    colCountdown: "Time Remaining",
    colQuantity: "Qty",
    colActions: "Quick Actions",
    actionSold: "Sold",
    actionChecked: "Shelf Checked",
    actionHandled: "Handled",
    actionCreated: "Registered",
    actionIncremented: "Qty Added",
    logTitle: "Branch Daily Action Logs",
    logEmpty: "No actions registered today.",
    logFormat: "Handled by Employee: {employee} - Time: {time}",
    notifTitle: "Smart Daily Notification System",
    notifSetting: "Notification Time Settings",
    notifTimeLabel: "Morning Shift Alert Hour:",
    notifBtnTest: "Simulate Morning Shift Alarm",
    notifSampleToast: "Daily notification: There are {count} products approaching their expiry date today, please review the checklist immediately.",
    statsTitle: "Shelf Status Summary",
    statsExpired: "Expired",
    statsWarning: "Critical (< 3 days)",
    statsSafe: "Safe (> 7 days)",
    statsTotal: "Total Products",
    badgeDaysLeft: "{days} days left",
    badgeDayLeft: "1 day left",
    badgeToday: "Expires Today!",
    badgeTomorrow: "Expires Tomorrow!",
    badgeExpired: "Expired!",
    simulationMode: "Interactive simulation mode is active to let you test all features immediately.",
    simulationAlert: "Note: Real-time image recognition is supported server-side.",
    cancel: "Cancel",
    addQuantity: "Add Qty",
    actionEdit: "Edit",
    editProductTitle: "Edit Product Details",
    editProductDesc: "Manually modify the product details, stock quantity, and expiry date.",
    saveChanges: "Save Changes",
    unitPiece: "Piece",
    unitCarton: "Carton",
    cartonCountLabel: "Number of Cartons",
    itemsPerCartonLabel: "Items per Carton",
    looseItemsLabel: "Loose Items (Optional)",
    totalCalculatedLabel: "Total Calculated Pieces",
    btnEnterDateManually: "Enter Date Manually",
    dateManualPlaceholder: "DD/MM/YYYY (e.g. 25/09/2025)",
    duplicateSeparateAlert: "⚠️ This product is exactly identical in name, brand, and date to an existing product. To save it as a separate product, please close this window and edit the name first in the text field (e.g. clarify the different flavor or packaging) to avoid duplicate entries!",
    duplicateBadge: "Warning: Duplicate",
    errorSelectExpiryDate: "⚠️ Please select the expiry date!",
    stepHeader1: "Cover & Name",
    stepHeader2: "Expiry Date",
    stepHeader3: "Review & Save"
  },
  de: {
    appTitle: "Smart Expiry Tracker",
    appSubtitle: "MHD-Ablauf-Verwaltungstool",
    appDescription: "KI-gestütztes Tool zur Nachverfolgung von Mindesthaltbarkeitsdaten und tägliche Checklisten für Filialen.",
    branch: "Filiale",
    branchSelect: "Aktive Filiale auswählen",
    createBranch: "Neue Filiale erstellen",
    branchPlaceholder: "Name der neuen Filiale...",
    activeEmployee: "Aktiver Mitarbeiter",
    employeePlaceholder: "Geben Sie Ihren Namen ein...",
    registerProduct: "Neues Produkt registrieren (Doppelfoto)",
    step1Title: "Schritt 1: Produktverpackung",
    step1Desc: "Verpackung fotografieren, um Name & Marke in mehreren Sprachen zu extrahieren.",
    step2Title: "Schritt 2: Ablaufdatum",
    step2Desc: "Gedrucktes Mindesthaltbarkeitsdatum (MHD) zur automatischen Erkennung fotografieren.",
    step3Title: "Schritt 3: Extrahierte Daten überprüfen",
    uploadPhoto: "Foto hochladen",
    snapPhoto: "Foto aufnehmen",
    useSample: "Muster verwenden",
    analyzing: "KI analysiert Bild über Gemini...",
    dateFallbackLabel: "Datum unleserlich? Manuell eingeben:",
    dateSuccessLabel: "Mindesthaltbarkeitsdatum erfolgreich erkannt:",
    datePlaceholder: "Ablaufdatum auswählen",
    confirmProduct: "Produkt bestätigen & speichern",
    duplicateTitle: "Intelligente Warnung: Dieses Produkt ist bereits mit diesem Datum registriert!",
    duplicateDesc: "Ein übereinstimmendes Produkt mit diesem Datum existiert bereits. Bitte visuell vergleichen, um Geschmacksrichtungen oder Klone zu unterscheiden.",
    duplicateCompareOld: "Zuvor registriertes Bild",
    duplicateCompareNew: "Neu aufgenommenes Bild",
    btnSameProduct: "Exakt dasselbe Produkt (Menge erhöhen)",
    btnDifferentFlavor: "Anderes Produkt/Sorte (Separat speichern)",
    filterAll: "Alle",
    filterToday: "Läuft heute ab",
    filterTomorrow: "Läuft morgen ab",
    filter2Days: "Läuft in 2 Tagen ab",
    filter1Week: "Läuft in 1 Woche ab",
    filterDuplicates: "Produkt-Duplikate",
    colProduct: "Produkt",
    colLanguages: "Originale mehrsprachige Namen",
    colExpiry: "Ablaufdatum (MHD)",
    colCountdown: "Verbleibende Zeit",
    colQuantity: "Menge",
    colActions: "Schnellaktionen",
    actionSold: "Verkauft",
    actionChecked: "Regal geprüft",
    actionHandled: "Erledigt",
    actionCreated: "Registriert",
    actionIncremented: "Menge hinzugefügt",
    logTitle: "Tägliches Aktivitätsprotokoll der Filiale",
    logEmpty: "Heute keine Aktivitäten registriert.",
    logFormat: "Erledigt durch Mitarbeiter: {employee} - Uhrzeit: {time}",
    notifTitle: "Intelligentes tägliches Benachrichtigungssystem",
    notifSetting: "Benachrichtigungszeit-Einstellungen",
    notifTimeLabel: "Uhrzeit der morgendlichen Schicht-Alarmierung:",
    notifBtnTest: "Morgenschicht-Alarm simulieren",
    notifSampleToast: "Tägliche Benachrichtigung: Heute laufen {count} Produkte ab. Bitte überprüfen Sie umgehend die Checkliste.",
    statsTitle: "Zusammenfassung des Regalstatus",
    statsExpired: "Abgelaufen",
    statsWarning: "Kritisch (< 3 Tage)",
    statsSafe: "Sicher (> 7 Tage)",
    statsTotal: "Produkte Gesamt",
    badgeDaysLeft: "{days} Tage übrig",
    badgeDayLeft: "1 Tag übrig",
    badgeToday: "Läuft heute ab!",
    badgeTomorrow: "Läuft morgen ab!",
    badgeExpired: "Abgelaufen!",
    simulationMode: "Interaktiver Simulationsmodus ist aktiv, um alle Funktionen sofort zu testen.",
    simulationAlert: "Hinweis: Echtzeit-Bilderkennung wird serverseitig unterstützt.",
    cancel: "Abbrechen",
    addQuantity: "Menge hinzufügen",
    actionEdit: "Bearbeiten",
    editProductTitle: "Produktdetails bearbeiten",
    editProductDesc: "Produktdetails, Bestandsmenge und Ablaufdatum manuell ändern.",
    saveChanges: "Änderungen speichern",
    unitPiece: "Stück",
    unitCarton: "Karton",
    cartonCountLabel: "Kartonanzahl",
    itemsPerCartonLabel: "Stück pro Karton",
    looseItemsLabel: "Einzelstücke (optional)",
    totalCalculatedLabel: "Berechnete Gesamtstückzahl",
    btnEnterDateManually: "Datum manuell eingeben",
    dateManualPlaceholder: "TT.MM.JJJJ (z.B. 25.09.2025)",
    duplicateSeparateAlert: "⚠️ Dieses Produkt ist in Name, Marke und Datum exakt identisch mit einem bereits vorhandenen Produkt. Um es als separates Produkt zu speichern, schließen Sie bitte dieses Fenster und bearbeiten Sie zuerst den Namen im Textfeld (z.B. Angabe einer anderen Sorte oder Verpackung), um doppelte Einträge zu vermeiden!",
    duplicateBadge: "Warnung: Duplikat",
    errorSelectExpiryDate: "⚠️ Bitte Ablaufdatum auswählen!",
    stepHeader1: "Bild & Name",
    stepHeader2: "MHD (Ablaufdatum)",
    stepHeader3: "Prüfen & Speichern"
  },
  tr: {
    appTitle: "Smart Expiry Tracker",
    appSubtitle: "MHD Son Kullanma Tarihi Takip Aracı",
    appDescription: "Yapay zeka destekli son kullanma tarihi takip aracı ve mağaza şubeleri için dinamik günlük kontrol listesi.",
    branch: "Şube",
    branchSelect: "Aktif Şubeyi Seçin",
    createBranch: "Yeni Şube Oluştur",
    branchPlaceholder: "Yeni şube adı...",
    activeEmployee: "Aktif Çalışan",
    employeePlaceholder: "İşlemleri kaydetmek için adınızı girin...",
    registerProduct: "Yeni Ürün Kaydet (Çift Fotoğraf)",
    step1Title: "1. Adım: Ürün Ambalajı",
    step1Desc: "İsim ve markayı çok dilli olarak çıkarmak için ürün ambalajını fotoğraflayın.",
    step2Title: "2. Adım: Son Kullanma Tarihi",
    step2Desc: "Otomatik tarih çıkarımı için basılı son kullanma tarihini fotoğraflayın.",
    step3Title: "3. Adım: Çıkarılan Verileri İnceleyin",
    uploadPhoto: "Fotoğraf Yükle",
    snapPhoto: "Fotoğraf Çek",
    useSample: "Örnek Kullan",
    analyzing: "Yapay Zeka Gemini üzerinden görüntüyü analiz ediyor...",
    dateFallbackLabel: "Tarih okunamıyor mu? Manuel girin:",
    dateSuccessLabel: "Son kullanma tarihi başarıyla çıkarıldı:",
    datePlaceholder: "Son kullanma tarihi seçin",
    confirmProduct: "Ürünü Onayla ve Kaydet",
    duplicateTitle: "Akıllı Uyarı: Bu ürün bu tarihle zaten kayıtlı!",
    duplicateDesc: "Eşleşen bir ürün ve tarih mevcut. Aromaları veya kopyaları ayırt etmek için lütfen görsel olarak karşılaştırın.",
    duplicateCompareOld: "Önceden Kayıtlı Görsel",
    duplicateCompareNew: "Yeni Çekilen Görsel",
    btnSameProduct: "Aynı Ürün (Miktarı Artır)",
    btnDifferentFlavor: "Farklı Ürün/Aroma (Ayrı Kaydet)",
    filterAll: "Tümü",
    filterToday: "Bugün Sona Eriyor",
    filterTomorrow: "Yarın Sona Eriyor",
    filter2Days: "2 Gün İçinde Sona Eriyor",
    filter1Week: "1 Hafta İçinde Sona Eriyor",
    filterDuplicates: "Mükerrer Ürünler",
    colProduct: "Ürün",
    colLanguages: "Orijinal Çok Dilli İsimler",
    colExpiry: "Son Kullanma Tarihi",
    colCountdown: "Kalan Süre",
    colQuantity: "Miktar",
    colActions: "Hızlı İşlemler",
    actionSold: "Satıldı",
    actionChecked: "Raf Kontrol Edildi",
    actionHandled: "Müdahale Edildi",
    actionCreated: "Kaydedildi",
    actionIncremented: "Miktar Eklendi",
    logTitle: "Şube Günlük İşlem Kayıtları",
    logEmpty: "Bugün kayıtlı işlem bulunmuyor.",
    logFormat: "Çalışan tarafından yapıldı: {employee} - Saat: {time}",
    notifTitle: "Akıllı Günlük Bildirim Sistemi",
    notifSetting: "Bildirim Saati Ayarları",
    notifTimeLabel: "Sabah Vardiyası Alarm Saati:",
    notifBtnTest: "Sabah Vardiyası Alarmını Simüle Et",
    notifSampleToast: "Günlük bildirim: Bugün son kullanma tarihi yaklaşan {count} ürün var, lütfen kontrol listesini hemen inceleyin.",
    statsTitle: "Raf Durumu Özeti",
    statsExpired: "Süresi Dolmuş",
    statsWarning: "Kritik (< 3 gün)",
    statsSafe: "Güvenli (> 7 gün)",
    statsTotal: "Toplam Ürün",
    badgeDaysLeft: "{days} gün kaldı",
    badgeDayLeft: "1 gün kaldı",
    badgeToday: "Bugün bitiyor!",
    badgeTomorrow: "Yarın bitiyor!",
    badgeExpired: "Süresi doldu!",
    simulationMode: "Tüm özellikleri anında test etmeniz için interaktif simülasyon modu aktiftir.",
    simulationAlert: "Not: Sunucu tarafında yapay zeka ile gerçek zamanlı görsel analizi desteklenir.",
    cancel: "İptal",
    addQuantity: "Miktar Ekle",
    actionEdit: "Düzenle",
    editProductTitle: "Ürün Bilgilerini Düzenle",
    editProductDesc: "Ürün detaylarını, stok miktarını ve son kullanma tarihini manuel olarak düzenleyin.",
    saveChanges: "Değişiklikleri Kaydet",
    unitPiece: "Adet",
    unitCarton: "Koli",
    cartonCountLabel: "Koli Sayısı",
    itemsPerCartonLabel: "Koli İçi Adet",
    looseItemsLabel: "Tekli Adet (İsteğe Bağlı)",
    totalCalculatedLabel: "Hesaplanan Toplam Adet",
    btnEnterDateManually: "Tarihi Manuel Girin",
    dateManualPlaceholder: "GG/AA/YYYY (Örn: 25/09/2025)",
    duplicateSeparateAlert: "⚠️ Bu ürün, mevcut bir ürünle ad, marka ve tarih açısından tamamen aynıdır. Farklı bir ürün olarak kaydetmek için lütfen bu pencereyi kapatın ve çift kayıtları önlemek için önce metin alanındaki adı düzenleyin (örneğin farklı bir aroma veya ambalaj belirtin)!",
    duplicateBadge: "Uyarı: Kopya Ürün",
    errorSelectExpiryDate: "⚠️ Lütfen son kullanma tarihini seçin!",
    stepHeader1: "Kapak & İsim",
    stepHeader2: "Son Kullanma Tarihi",
    stepHeader3: "İncele & Kaydet"
  }
};
