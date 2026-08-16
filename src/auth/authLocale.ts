/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth/admin strings, kept separate from localization.ts so the product-facing
 * translation table stays readable.
 */

export interface AuthTranslations {
  // Login
  signInTitle: string;
  signInSubtitle: string;
  emailLabel: string;
  passwordLabel: string;
  signInButton: string;
  signingIn: string;
  invalidCredentials: string;
  genericSignInError: string;
  signOut: string;
  // Account states
  accountDeactivated: string;
  accountNoProfile: string;
  accountLoadFailed: string;
  // Branch picker
  chooseBranch: string;
  chooseBranchSubtitle: string;
  noBranchesYet: string;
  noBranchAssigned: string;
  productCount: string;
  expiringSoon: string;
  backToBranches: string;
  addBranch: string;
  branchNameLabel: string;
  branchIdLabel: string;
  branchIdHint: string;
  createBranchButton: string;
  creating: string;
  // User management
  manageUsers: string;
  manageUsersSubtitle: string;
  addUser: string;
  fullNameLabel: string;
  roleLabel: string;
  branchAssignLabel: string;
  createUserButton: string;
  userCreated: string;
  existingUsers: string;
  noUsersYet: string;
  statusActive: string;
  statusInactive: string;
  deactivate: string;
  activate: string;
  passwordHint: string;
  // Roles
  roleMasterAdmin: string;
  roleMasterChef: string;
  roleChef: string;
  roleEmployee: string;
  // Permission feedback
  notAllowed: string;
}

export const authLocale: Record<string, AuthTranslations> = {
  ar: {
    signInTitle: "تسجيل الدخول",
    signInSubtitle: "متتبّع صلاحية المنتجات",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة السر",
    signInButton: "دخول",
    signingIn: "جارِ الدخول...",
    invalidCredentials: "البريد الإلكتروني أو كلمة السر غير صحيحة",
    genericSignInError: "تعذّر تسجيل الدخول. حاول مرة أخرى.",
    signOut: "تسجيل الخروج",
    accountDeactivated: "حسابك موقوف. راجع مسؤول الفرع.",
    accountNoProfile: "لا يوجد ملف تعريف لهذا الحساب. راجع المسؤول.",
    accountLoadFailed: "تعذّر تحميل بيانات الحساب.",
    chooseBranch: "اختر الفرع",
    chooseBranchSubtitle: "اضغط على فرع للدخول إليه",
    noBranchesYet: "لا توجد أفرع بعد. أضف فرعك الأول.",
    noBranchAssigned: "لم يتم تعيينك لأي فرع. راجع المسؤول.",
    productCount: "منتج",
    expiringSoon: "قارب على الانتهاء",
    backToBranches: "الأفرع",
    addBranch: "إضافة فرع",
    branchNameLabel: "اسم الفرع",
    branchIdLabel: "معرّف الفرع",
    branchIdHint: "أحرف إنجليزية صغيرة وشرطات فقط",
    createBranchButton: "إنشاء الفرع",
    creating: "جارِ الإنشاء...",
    manageUsers: "إدارة المستخدمين",
    manageUsersSubtitle: "إضافة الحسابات وتحديد صلاحياتها",
    addUser: "إضافة مستخدم",
    fullNameLabel: "الاسم الكامل",
    roleLabel: "الدور",
    branchAssignLabel: "الفرع",
    createUserButton: "إنشاء الحساب",
    userCreated: "تم إنشاء الحساب بنجاح",
    existingUsers: "المستخدمون الحاليون",
    noUsersYet: "لا يوجد مستخدمون بعد",
    statusActive: "نشط",
    statusInactive: "موقوف",
    deactivate: "إيقاف",
    activate: "تفعيل",
    passwordHint: "8 أحرف على الأقل",
    roleMasterAdmin: "المدير العام",
    roleMasterChef: "صاحب الأفرع",
    roleChef: "مسؤول الفرع",
    roleEmployee: "موظف",
    notAllowed: "ليس لديك صلاحية لهذا الإجراء",
  },
  en: {
    signInTitle: "Sign in",
    signInSubtitle: "Product Expiry Tracker",
    emailLabel: "Email",
    passwordLabel: "Password",
    signInButton: "Sign in",
    signingIn: "Signing in...",
    invalidCredentials: "Incorrect email or password",
    genericSignInError: "Could not sign in. Please try again.",
    signOut: "Sign out",
    accountDeactivated: "Your account has been deactivated. Contact your manager.",
    accountNoProfile: "No profile exists for this account. Contact your administrator.",
    accountLoadFailed: "Could not load your account.",
    chooseBranch: "Choose a branch",
    chooseBranchSubtitle: "Select a branch to open it",
    noBranchesYet: "No branches yet. Add your first one.",
    noBranchAssigned: "You are not assigned to any branch. Contact your manager.",
    productCount: "products",
    expiringSoon: "expiring soon",
    backToBranches: "Branches",
    addBranch: "Add branch",
    branchNameLabel: "Branch name",
    branchIdLabel: "Branch id",
    branchIdHint: "lowercase letters and dashes only",
    createBranchButton: "Create branch",
    creating: "Creating...",
    manageUsers: "Manage users",
    manageUsersSubtitle: "Create accounts and set their permissions",
    addUser: "Add user",
    fullNameLabel: "Full name",
    roleLabel: "Role",
    branchAssignLabel: "Branch",
    createUserButton: "Create account",
    userCreated: "Account created successfully",
    existingUsers: "Existing users",
    noUsersYet: "No users yet",
    statusActive: "Active",
    statusInactive: "Deactivated",
    deactivate: "Deactivate",
    activate: "Activate",
    passwordHint: "at least 8 characters",
    roleMasterAdmin: "Master admin",
    roleMasterChef: "Branch owner",
    roleChef: "Branch manager",
    roleEmployee: "Employee",
    notAllowed: "You do not have permission for this action",
  },
  de: {
    signInTitle: "Anmelden",
    signInSubtitle: "Haltbarkeits-Tracker",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    signInButton: "Anmelden",
    signingIn: "Anmeldung läuft...",
    invalidCredentials: "E-Mail oder Passwort ist falsch",
    genericSignInError: "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
    signOut: "Abmelden",
    accountDeactivated: "Ihr Konto wurde deaktiviert. Bitte an die Leitung wenden.",
    accountNoProfile: "Für dieses Konto existiert kein Profil. Bitte an den Administrator wenden.",
    accountLoadFailed: "Konto konnte nicht geladen werden.",
    chooseBranch: "Filiale wählen",
    chooseBranchSubtitle: "Filiale antippen zum Öffnen",
    noBranchesYet: "Noch keine Filialen. Legen Sie die erste an.",
    noBranchAssigned: "Ihnen ist keine Filiale zugewiesen. Bitte an die Leitung wenden.",
    productCount: "Produkte",
    expiringSoon: "läuft bald ab",
    backToBranches: "Filialen",
    addBranch: "Filiale hinzufügen",
    branchNameLabel: "Filialname",
    branchIdLabel: "Filial-ID",
    branchIdHint: "nur Kleinbuchstaben und Bindestriche",
    createBranchButton: "Filiale anlegen",
    creating: "Wird angelegt...",
    manageUsers: "Benutzer verwalten",
    manageUsersSubtitle: "Konten anlegen und Rechte vergeben",
    addUser: "Benutzer hinzufügen",
    fullNameLabel: "Vollständiger Name",
    roleLabel: "Rolle",
    branchAssignLabel: "Filiale",
    createUserButton: "Konto anlegen",
    userCreated: "Konto erfolgreich angelegt",
    existingUsers: "Vorhandene Benutzer",
    noUsersYet: "Noch keine Benutzer",
    statusActive: "Aktiv",
    statusInactive: "Deaktiviert",
    deactivate: "Deaktivieren",
    activate: "Aktivieren",
    passwordHint: "mindestens 8 Zeichen",
    roleMasterAdmin: "Hauptadministrator",
    roleMasterChef: "Filialinhaber",
    roleChef: "Filialleiter",
    roleEmployee: "Mitarbeiter",
    notAllowed: "Sie haben keine Berechtigung für diese Aktion",
  },
  tr: {
    signInTitle: "Giriş yap",
    signInSubtitle: "Son Kullanma Takibi",
    emailLabel: "E-posta",
    passwordLabel: "Şifre",
    signInButton: "Giriş",
    signingIn: "Giriş yapılıyor...",
    invalidCredentials: "E-posta veya şifre hatalı",
    genericSignInError: "Giriş yapılamadı. Tekrar deneyin.",
    signOut: "Çıkış yap",
    accountDeactivated: "Hesabınız devre dışı bırakıldı. Yöneticinize başvurun.",
    accountNoProfile: "Bu hesap için profil yok. Yöneticinize başvurun.",
    accountLoadFailed: "Hesap bilgileri yüklenemedi.",
    chooseBranch: "Şube seçin",
    chooseBranchSubtitle: "Açmak için bir şubeye dokunun",
    noBranchesYet: "Henüz şube yok. İlkini ekleyin.",
    noBranchAssigned: "Hiçbir şubeye atanmadınız. Yöneticinize başvurun.",
    productCount: "ürün",
    expiringSoon: "yakında doluyor",
    backToBranches: "Şubeler",
    addBranch: "Şube ekle",
    branchNameLabel: "Şube adı",
    branchIdLabel: "Şube kimliği",
    branchIdHint: "yalnızca küçük harf ve tire",
    createBranchButton: "Şube oluştur",
    creating: "Oluşturuluyor...",
    manageUsers: "Kullanıcıları yönet",
    manageUsersSubtitle: "Hesap oluştur ve yetki ver",
    addUser: "Kullanıcı ekle",
    fullNameLabel: "Ad soyad",
    roleLabel: "Rol",
    branchAssignLabel: "Şube",
    createUserButton: "Hesap oluştur",
    userCreated: "Hesap başarıyla oluşturuldu",
    existingUsers: "Mevcut kullanıcılar",
    noUsersYet: "Henüz kullanıcı yok",
    statusActive: "Aktif",
    statusInactive: "Devre dışı",
    deactivate: "Devre dışı bırak",
    activate: "Etkinleştir",
    passwordHint: "en az 8 karakter",
    roleMasterAdmin: "Ana yönetici",
    roleMasterChef: "Şube sahibi",
    roleChef: "Şube müdürü",
    roleEmployee: "Çalışan",
    notAllowed: "Bu işlem için yetkiniz yok",
  },
};

export function getAuthLocale(locale: string): AuthTranslations {
  return authLocale[locale] || authLocale.ar;
}
