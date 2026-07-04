/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Languages,
  Bell,
  Plus,
  Trash2,
  CheckCircle,
  Search,
  AlertTriangle,
  RefreshCw,
  Upload,
  Camera,
  ShoppingCart,
  User,
  Calendar,
  Shield,
  MapPin,
  Sparkles,
  Filter,
  Check,
  X,
  FileText,
  Info,
  Clock,
  Database,
  ChevronRight,
  PlusCircle,
  Minus,
  Edit,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { localization } from "./localization";
import { sampleProducts, SampleProduct } from "./samples";
import { Product, ActivityLog, Branch, MultilingualName } from "./types";
import { fetchBranchData, syncBranchData as dbSyncBranchData, checkDatabaseHealth, deleteProductFromDb } from "./lib/database";
import { analyzePackage, analyzeExpiry } from "./lib/gemini";

export default function App() {
  // Localization state
  const [locale, setLocale] = useState<string>(() => {
    return localStorage.getItem("expiry_tracker_locale") || "ar";
  });
  const t = localization[locale] || localization.ar;

  // Branch and Employee states
  const [activeBranch, setActiveBranch] = useState<string>(() => {
    return localStorage.getItem("expiry_tracker_branch") || "main-branch";
  });
  const [activeEmployee, setActiveEmployee] = useState<string>(() => {
    const val = localStorage.getItem("expiry_tracker_employee");
    if (val && (val.trim().toLowerCase() === "rahaf" || val.trim() === "rahaf" || val.trim() === "احمد")) {
      localStorage.setItem("expiry_tracker_employee", "rahaf");
      return "rahaf";
    }
    return val || "rahaf";
  });
  const [newBranchName, setNewBranchName] = useState("");
  const [branches, setBranches] = useState<Branch[]>([
    { id: "main-branch", name: "الفرع الرئيسي / Hauptfiliale" },
    { id: "south-warehouse", name: "مخزن الجنوب / Südlager" }
  ]);

  // Product and logs list
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isHealthCheck, setIsHealthCheck] = useState({ checked: false, geminiConfigured: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [notifTime, setNotifTime] = useState("08:00");
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  // App initialization & synchronization
  const [isLoading, setIsLoading] = useState(true);

  // Registration wizard states
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);

  // New product form states
  const [packagingImage, setPackagingImage] = useState<string>("");
  const [expiryImage, setExpiryImage] = useState<string>("");
  const [extractedName, setExtractedName] = useState("");
  const [extractedBrand, setExtractedBrand] = useState("");
  const [extractedMultilingual, setExtractedMultilingual] = useState<MultilingualName[]>([]);
  const [extractedExpiryDate, setExtractedExpiryDate] = useState("");
  const [manualExpiryInput, setManualExpiryInput] = useState("");
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [quantityUnitInput, setQuantityUnitInput] = useState<'pcs' | 'cartons'>("pcs");
  const [unitsPerCartonInput, setUnitsPerCartonInput] = useState<number>(12);
  const [looseUnitsInput, setLooseUnitsInput] = useState<number>(0);
  const [ocrStatus, setOcrStatus] = useState<string>("");

  // Camera capture hooks
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStep, setCameraStep] = useState<1 | 2 | 3 | 4 | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Duplicate Check Overlay states
  const [duplicateFound, setDuplicateFound] = useState<Product | null>(null);
  const [pendingProduct, setPendingProduct] = useState<any | null>(null);

  // Edit Product states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingBrand, setEditingBrand] = useState("");
  const [editingExpiryDate, setEditingExpiryDate] = useState("");
  const [editingQuantity, setEditingQuantity] = useState<number>(1);
  const [editingQuantityUnit, setEditingQuantityUnit] = useState<'pcs' | 'cartons'>("pcs");
  const [editingUnitsPerCarton, setEditingUnitsPerCarton] = useState<number>(12);
  const [editingLooseUnits, setEditingLooseUnits] = useState<number>(0);
  const [editingMultilingual, setEditingMultilingual] = useState<MultilingualName[]>([]);

  // Product Detail Modal
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Fullscreen WhatsApp-like image preview
  const [viewingFullImage, setViewingFullImage] = useState<string | null>(null);
  const [viewingFullImageGroupProducts, setViewingFullImageGroupProducts] = useState<Product[]>([]);

  // WhatsApp-like Camera facing mode and flash status
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [flashOn, setFlashOn] = useState(false);

  // Image search mode
  const [isSearchingByImage, setIsSearchingByImage] = useState(false);

  // Registration warning/error state
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Load branch data directly from Supabase (static hosting compatible)
  const loadBranchData = async (branchId: string) => {
    try {
      setIsLoading(true);
      const data = await fetchBranchData(branchId);
      setProducts(data.products || []);
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Error loading branch details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync data directly to Supabase (static hosting compatible)
  const syncBranchData = async (newProducts: Product[], newLogs: ActivityLog[]) => {
    try {
      await dbSyncBranchData(activeBranch, newProducts, newLogs);
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  // Check Supabase + Gemini configuration (static hosting compatible)
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const dbOk = await checkDatabaseHealth();
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
        const geminiConfigured = !!geminiKey && geminiKey.trim() !== "";
        setIsHealthCheck({ checked: true, geminiConfigured: dbOk && geminiConfigured });
      } catch (e) {
        setIsHealthCheck({ checked: true, geminiConfigured: false });
      }
    };
    checkHealth();
  }, []);

  // Sync to branch on change
  useEffect(() => {
    loadBranchData(activeBranch);
    localStorage.setItem("expiry_tracker_branch", activeBranch);
  }, [activeBranch]);

  // Handle employee storage
  useEffect(() => {
    localStorage.setItem("expiry_tracker_employee", activeEmployee);
  }, [activeEmployee]);

  // Handle locale storage
  useEffect(() => {
    localStorage.setItem("expiry_tracker_locale", locale);
  }, [locale]);

  // Camera handling helper with facing mode parameter
  const startCamera = async (step: 1 | 2 | 3 | 4, currentFacingMode = facingMode) => {
    try {
      setCameraStep(step);
      setCameraActive(true);
      setFlashOn(false); // Reset flash

      // Stop existing stream tracks first
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: currentFacingMode },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("تعذر الوصول إلى الكاميرا. يرجى رفع صورة أو استخدام وضع المحاكاة.");
      setCameraActive(false);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (cameraStep) {
      startCamera(cameraStep, nextMode);
    }
  };

  const toggleFlash = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.torch !== undefined) {
            await track.applyConstraints({
              advanced: [{ torch: !flashOn } as any]
            });
            setFlashOn(!flashOn);
          } else {
            alert(locale === "ar" ? "الفلاش غير مدعوم على هذه الكاميرا." : "Flash not supported on this camera.");
          }
        } catch (e) {
          console.error("Failed to toggle flash:", e);
        }
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStep(null);
    setFlashOn(false);
  };

  const updateGroupProductsImage = (newImageBase64: string) => {
    if (viewingFullImageGroupProducts.length === 0) return;
    
    const productIdsToUpdate = viewingFullImageGroupProducts.map(p => p.id);
    const updatedProducts = products.map((p) => {
      if (productIdsToUpdate.includes(p.id)) {
        return {
          ...p,
          imageUrl: newImageBase64,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              employeeName: activeEmployee || "Employee",
              action: "image_updated",
              timestamp: new Date().toISOString(),
            }
          ]
        };
      }
      return p;
    });

    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: productIdsToUpdate[0],
      productName: viewingFullImageGroupProducts[0].name,
      brand: viewingFullImageGroupProducts[0].brand,
      employeeName: activeEmployee || "Employee",
      action: "image_updated",
      timestamp: new Date().toISOString(),
    };
    const updatedLogs = [newLog, ...logs];

    setProducts(updatedProducts);
    setLogs(updatedLogs);
    
    const modifiedProducts = updatedProducts.filter(p => productIdsToUpdate.includes(p.id));
    syncBranchData(modifiedProducts, [newLog]);
    
    // Update active full image preview and the local reference
    setViewingFullImage(newImageBase64);
    setViewingFullImageGroupProducts(
      viewingFullImageGroupProducts.map(p => ({ ...p, imageUrl: newImageBase64 }))
    );
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg");
        if (cameraStep === 1) {
          setPackagingImage(base64);
          triggerPackageOCR(base64, false, null);
        } else if (cameraStep === 2) {
          setExpiryImage(base64);
          triggerExpiryOCR(base64, false, null);
        } else if (cameraStep === 3) {
          triggerImageSearch(base64);
        } else if (cameraStep === 4) {
          updateGroupProductsImage(base64);
        }
      }
      stopCamera();
    }
  };

  // Image search trigger
  const triggerImageSearch = async (imageBase64: string) => {
    setOcrStatus("analyzing");
    try {
      const data = await analyzePackage(imageBase64);
      if (data.name) {
        setSearchQuery(data.name);
        setToastMessage(locale === "ar" ? `تم البحث بـ: ${data.name}` : `Searched for: ${data.name}`);
        setShowNotificationToast(true);
        setTimeout(() => setShowNotificationToast(false), 3000);
      }
    } catch (err) {
      console.error("Visual search error:", err);
      alert(locale === "ar" ? "تعذر تحديد المنتج من الصورة." : "Could not identify product from image.");
    } finally {
      setOcrStatus("");
      setIsSearchingByImage(false);
    }
  };

  // Upload handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, step: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (step === 1) {
          setPackagingImage(base64);
          triggerPackageOCR(base64, false, null);
        } else {
          setExpiryImage(base64);
          triggerExpiryOCR(base64, false, null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Gemini OCR directly from browser (static hosting compatible)
  const triggerPackageOCR = async (imageBase64: string, isMock: boolean, sample: SampleProduct | null) => {
    setOcrStatus("analyzing");
    setExtractedName("");
    setExtractedBrand("");
    setExtractedMultilingual([]);

    try {
      // Use mock sample data instantly (no API call needed)
      if (isMock && sample) {
        setExtractedName(sample.name);
        setExtractedBrand(sample.brand);
        setExtractedMultilingual(sample.multilingualNames);
        setRegisterStep(2);
        return;
      }

      // Call Gemini directly from the browser
      const data = await analyzePackage(imageBase64);
      setExtractedName(data.name || "منتج جديد");
      setExtractedBrand(data.brand || "علامة غير محددة");
      setExtractedMultilingual(data.multilingualNames || []);
      setRegisterStep(2);
    } catch (err) {
      console.error("OCR Package Error:", err);
      // Fallback to manual entry
      setExtractedName("منتج تم تصويره يدوياً");
      setExtractedBrand("علامة غير محددة");
      setExtractedMultilingual([{ language: "العربية", name: "منتج جديد" }]);
      setRegisterStep(2);
    } finally {
      setOcrStatus("");
    }
  };

  const triggerExpiryOCR = async (imageBase64: string, isMock: boolean, defaultOffset: number | null) => {
    setOcrStatus("analyzing");
    setExtractedExpiryDate("");
    setManualExpiryInput("");

    try {
      // Calculate mock date offset for sample products
      let targetDate = "";
      if (defaultOffset !== null) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + defaultOffset);
        targetDate = dateObj.toISOString().split("T")[0];
      }

      // Use mock date instantly for sample products (no API call needed)
      if (isMock && targetDate) {
        setExtractedExpiryDate(targetDate);
        setManualExpiryInput(targetDate);
        setRegisterStep(3);
        return;
      }

      // Call Gemini directly from the browser
      const data = await analyzeExpiry(imageBase64);
      if (data.expiryDate) {
        setExtractedExpiryDate(data.expiryDate);
        setManualExpiryInput(data.expiryDate);
      } else {
        const fallback = targetDate || new Date().toISOString().split("T")[0];
        setManualExpiryInput(fallback);
      }
      setRegisterStep(3);
    } catch (err) {
      console.error("OCR Expiry Error:", err);
      setManualExpiryInput(new Date().toISOString().split("T")[0]);
      setRegisterStep(3);
    } finally {
      setOcrStatus("");
    }
  };

  // Simulate registering via preconfigured samples
  const selectSample = (sample: SampleProduct) => {
    setPackagingImage(sample.imageUrl);
    setExpiryImage(sample.imageUrl); // share image for simplicity

    // Briefly show scanning animation before advancing
    setOcrStatus("analyzing");
    setTimeout(() => {
      triggerPackageOCR(sample.imageUrl, true, sample);
      triggerExpiryOCR(sample.imageUrl, true, sample.defaultDaysOffset);
    }, 1000);
  };

  // Finish Registration & Perform Duplicate / Flavor Checks
  const finishProductRegistration = () => {
    const finalDate = manualExpiryInput || extractedExpiryDate;
    if (!finalDate) {
      alert("يرجى اختيار تاريخ الصلاحية للمنتج!");
      return;
    }

    const qty = Number(quantityInput) || 1;
    const unitsPer = Number(unitsPerCartonInput) || 1;
    const loose = Number(looseUnitsInput) || 0;

    const totalQuantity = quantityUnitInput === "cartons"
      ? (qty * unitsPer) + loose
      : qty;

    const proposedProduct = {
      name: extractedName,
      brand: extractedBrand,
      multilingualNames: extractedMultilingual.length > 0 ? extractedMultilingual : [{ language: "Original", name: extractedName }],
      expiryDate: finalDate,
      imageUrl: packagingImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
      status: "active" as const,
      quantity: totalQuantity,
      quantityUnit: quantityUnitInput,
      unitsPerCarton: quantityUnitInput === "cartons" ? unitsPer : 1,
      looseUnits: quantityUnitInput === "cartons" ? loose : 0,
    };

    // Duplicate Check: Same Name, Same Brand, Same Expiry Date & Active
    const isNameMatch = (p1: any, p2: any) => {
      const n1 = p1.name.trim().toLowerCase();
      const n2 = p2.name.trim().toLowerCase();
      const b1 = (p1.brand || "").trim().toLowerCase();
      const b2 = (p2.brand || "").trim().toLowerCase();
      
      if (b1 !== b2) return false;
      if (n1 === n2) return true;
      
      const p1Names = (p1.multilingualNames || []).map((m: any) => m.name.trim().toLowerCase());
      const p2Names = (p2.multilingualNames || []).map((m: any) => m.name.trim().toLowerCase());
      
      return p1Names.some((name: string) => p2Names.includes(name)) || p1Names.includes(n2) || p2Names.includes(n1);
    };

    const match = products.find(
      (p) =>
        p.status === "active" &&
        p.expiryDate === proposedProduct.expiryDate &&
        isNameMatch(p, proposedProduct)
    );

    if (match) {
      setRegistrationError(
        locale === "ar"
          ? `هذا المنتج (${proposedProduct.name}) موجود بالفعل بنفس تاريخ الصلاحية (${finalDate.split("-").reverse().join(".")})!`
          : `This product (${proposedProduct.name}) already exists with the same expiry date (${finalDate.split("-").reverse().join(".")})!`
      );
      return; // Block adding
    }

    // Save directly
    saveNewProduct(proposedProduct);
  };

  const saveNewProduct = (newProd: any) => {
    const createdProduct: Product = {
      ...newProd,
      id: "prod_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [
        {
          employeeName: activeEmployee || "Unknown",
          action: "created",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updatedProducts = [createdProduct, ...products];
    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: createdProduct.id,
      productName: createdProduct.name,
      brand: createdProduct.brand,
      employeeName: activeEmployee || "Employee",
      action: "created",
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];

    setProducts(updatedProducts);
    setLogs(updatedLogs);
    syncBranchData([createdProduct], [newLog]);

    // reset forms
    resetForms();
  };

  const resolveDuplicateWithMerge = () => {
    if (!duplicateFound || !pendingProduct) return;

    // Increment existing quantity
    const updatedProducts = products.map((p) => {
      if (p.id === duplicateFound.id) {
        return {
          ...p,
          quantity: p.quantity + pendingProduct.quantity,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              employeeName: activeEmployee || "Employee",
              action: `quantity_incremented (+${pendingProduct.quantity})`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return p;
    });

    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: duplicateFound.id,
      productName: duplicateFound.name,
      brand: duplicateFound.brand,
      employeeName: activeEmployee || "Employee",
      action: "quantity_incremented",
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];
    setProducts(updatedProducts);
    setLogs(updatedLogs);
    const mergedProduct = updatedProducts.find(p => p.id === duplicateFound.id);
    syncBranchData(mergedProduct ? [mergedProduct] : [], [newLog]);

    resetForms();
  };

  const resolveDuplicateWithSeparate = () => {
    if (!pendingProduct) return;
    // Save as distinct product to allow flavor difference (e.g. Cocoa vs Classic)
    saveNewProduct(pendingProduct);
  };

  const resetForms = () => {
    setPackagingImage("");
    setExpiryImage("");
    setExtractedName("");
    setExtractedBrand("");
    setExtractedMultilingual([]);
    setExtractedExpiryDate("");
    setManualExpiryInput("");
    setQuantityInput(1);
    setQuantityUnitInput("pcs");
    setUnitsPerCartonInput(12);
    setLooseUnitsInput(0);
    setIsRegistering(false);
    setRegisterStep(1);
    setDuplicateFound(null);
    setPendingProduct(null);
    setRegistrationError(null);
  };

  // Handle Product Status Clicks (🛒 Sold, 👁️ Checked, ✅ Handled)
  const handleProductAction = (productId: string, action: "sold" | "shelf_checked" | "handled") => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const updatedProducts = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          status: "handled" as const, // any action (sold, shelf_checked, handled) sets status to handled so it is removed from the active list
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              employeeName: activeEmployee || "Employee",
              action: action,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return p;
    });

    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: productId,
      productName: targetProduct.name,
      brand: targetProduct.brand,
      employeeName: activeEmployee || "Employee",
      action: action,
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];
    setProducts(updatedProducts);
    setLogs(updatedLogs);
    
    const actedProduct = updatedProducts.find((p) => p.id === productId);
    syncBranchData(actedProduct ? [actedProduct] : [], [newLog]);
  };

  // Restore an archived product back to the active shelf
  const handleProductRestore = (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const updatedProducts = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          status: "active" as const,
          updatedAt: new Date().toISOString(),
          logs: [
            ...p.logs,
            {
              employeeName: activeEmployee || "Employee",
              action: "restored",
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return p;
    });

    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: productId,
      productName: targetProduct.name,
      brand: targetProduct.brand,
      employeeName: activeEmployee || "Employee",
      action: "restored",
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];
    setProducts(updatedProducts);
    setLogs(updatedLogs);

    const actedProduct = updatedProducts.find((p) => p.id === productId);
    syncBranchData(actedProduct ? [actedProduct] : [], [newLog]);
  };

  // Quick deletion helper
  const deleteProduct = async (id: string) => {
    const targetProduct = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    setDeletingProductId(null);
    if (viewingProduct?.id === id) setViewingProduct(null);

    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: id,
      productName: targetProduct?.name || "Product",
      brand: targetProduct?.brand || "",
      employeeName: activeEmployee || "Employee",
      action: "deleted",
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    try {
      await deleteProductFromDb(id);
      await syncBranchData([], [newLog]);
    } catch (err) {
      console.error("Error deleting product from database:", err);
    }
  };

  // Edit product helpers
  const startEditing = (p: Product) => {
    const unit = p.quantityUnit || "pcs";
    const unitsPer = p.unitsPerCarton || 12;
    const loose = p.looseUnits || 0;
    const cartonsCount = unit === "cartons" ? Math.floor((p.quantity - loose) / unitsPer) : 1;

    setEditingProduct(p);
    setEditingName(p.name);
    setEditingBrand(p.brand || "");
    setEditingExpiryDate(p.expiryDate);
    setEditingQuantityUnit(unit);
    setEditingUnitsPerCarton(unitsPer);
    setEditingLooseUnits(loose);
    setEditingQuantity(unit === "cartons" ? cartonsCount : p.quantity);
    setEditingMultilingual(p.multilingualNames ? JSON.parse(JSON.stringify(p.multilingualNames)) : []);
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditingName("");
    setEditingBrand("");
    setEditingExpiryDate("");
    setEditingQuantity(1);
    setEditingQuantityUnit("pcs");
    setEditingUnitsPerCarton(12);
    setEditingLooseUnits(0);
    setEditingMultilingual([]);
  };

  const saveEditedProduct = () => {
    if (!editingProduct) return;

    const qty = Number(editingQuantity) || 1;
    const unitsPer = Number(editingUnitsPerCarton) || 1;
    const loose = Number(editingLooseUnits) || 0;

    const totalQuantity = editingQuantityUnit === "cartons"
      ? (qty * unitsPer) + loose
      : qty;

    const updatedProducts = products.map((p) => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          name: editingName,
          brand: editingBrand,
          expiryDate: editingExpiryDate,
          quantity: totalQuantity,
          quantityUnit: editingQuantityUnit,
          unitsPerCarton: editingQuantityUnit === "cartons" ? unitsPer : 1,
          looseUnits: editingQuantityUnit === "cartons" ? loose : 0,
          multilingualNames: editingMultilingual,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    const newLog: ActivityLog = {
      id: "log_" + Date.now(),
      branchId: activeBranch,
      productId: editingProduct.id,
      productName: editingName,
      brand: editingBrand,
      employeeName: activeEmployee || "Employee",
      action: "handled",
      timestamp: new Date().toISOString(),
    };

    const updatedLogs = [newLog, ...logs];
    setProducts(updatedProducts);
    setLogs(updatedLogs);
    const editedProd = updatedProducts.find(p => p.id === editingProduct.id);
    syncBranchData(editedProd ? [editedProd] : [], [newLog]);
    cancelEditing();
  };

  // Switch Branch helper
  const createBranchHelper = () => {
    if (!newBranchName.trim()) return;
    const cleanId = newBranchName.toLowerCase().replace(/\s+/g, "-");
    const newBr: Branch = { id: cleanId, name: newBranchName };
    setBranches([...branches, newBr]);
    setActiveBranch(cleanId);
    setNewBranchName("");
  };

  // Alarm simulation toaster
  const simulateMorningAlarm = () => {
    // Count active products that have expired or expire within 2 days
    const dangerCount = products.filter((p) => {
      if (p.status !== "active") return false;
      const days = getDaysRemaining(p.expiryDate);
      return days <= 2;
    }).length;

    const text = t.notifSampleToast.replace("{count}", String(dangerCount));
    setToastMessage(text);
    setShowNotificationToast(true);
    setTimeout(() => {
      setShowNotificationToast(false);
    }, 6000);
  };

  // Format product quantity text based on pieces or cartons
  const formatQuantity = (quantity: number, unit?: "pcs" | "cartons", unitsPer?: number, loose?: number) => {
    if (unit === "cartons") {
      const uPer = unitsPer || 12;
      const l = loose || 0;
      const cartons = Math.floor((quantity - l) / uPer);

      const cartonText = locale === "ar" ? "كرتونة" : locale === "tr" ? "Koli" : locale === "de" ? "Krt" : "Ctn";
      const pieceText = locale === "ar" ? "قطعة" : locale === "tr" ? "Adet" : locale === "de" ? "Stk" : "pcs";

      let res = `${cartons} ${cartonText}`;
      if (l > 0) {
        res += ` + ${l} ${pieceText}`;
      }
      return `${res} (${quantity} ${pieceText})`;
    }
    return `${quantity} ${locale === "ar" ? "قطعة" : "pcs"}`;
  };

  // Helper calculation for days remaining
  const getDaysRemaining = (expiryStr: string): number => {
    const exp = new Date(expiryStr);
    const today = new Date();
    // Clear time
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = exp.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Dynamic color helper for countdowns
  const getBadgeStyle = (days: number) => {
    if (days < 0) {
      return {
        bg: "bg-red-100 text-red-700 border-red-200",
        dot: "bg-red-600",
        label: t.badgeExpired,
      };
    } else if (days === 0) {
      return {
        bg: "bg-red-100 text-red-700 border-red-200 animate-pulse",
        dot: "bg-red-600",
        label: t.badgeToday,
      };
    } else if (days === 1) {
      return {
        bg: "bg-orange-100 text-orange-700 border-orange-200",
        dot: "bg-orange-600",
        label: t.badgeTomorrow,
      };
    } else if (days <= 3) {
      return {
        bg: "bg-orange-50 text-orange-800 border-orange-200/50",
        dot: "bg-orange-500",
        label: t.badgeDaysLeft.replace("{days}", String(days)),
      };
    } else if (days <= 7) {
      return {
        bg: "bg-blue-100 text-blue-700 border-blue-200",
        dot: "bg-blue-600",
        label: t.badgeDaysLeft.replace("{days}", String(days)),
      };
    } else {
      return {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        dot: "bg-slate-600",
        label: t.badgeDaysLeft.replace("{days}", String(days)),
      };
    }
  };

  // Statistics
  const activeProducts = products.filter((p) => p.status === "active");
  const expiredCount = activeProducts.filter((p) => getDaysRemaining(p.expiryDate) < 0).length;
  const criticalCount = activeProducts.filter((p) => {
    const days = getDaysRemaining(p.expiryDate);
    return days >= 0 && days <= 3;
  }).length;
  const safeCount = activeProducts.filter((p) => getDaysRemaining(p.expiryDate) > 7).length;

  // Filter and search logic
  const filteredProducts = products.filter((p) => {
    // If selectedFilter is not "archive", only show active products
    if (selectedFilter !== "archive" && p.status !== "active") {
      return false;
    }
    // If selectedFilter is "archive", only show non-active (sold, checked, handled) products
    if (selectedFilter === "archive" && p.status === "active") {
      return false;
    }

    // Search filter
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.expiryDate.includes(searchQuery) ||
      p.expiryDate.split("-").reverse().join(".").includes(searchQuery) ||
      p.multilingualNames.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Time filter
    const days = getDaysRemaining(p.expiryDate);
    if (selectedFilter === "today") return days === 0;
    if (selectedFilter === "tomorrow") return days === 1;
    if (selectedFilter === "2days") return days >= 0 && days <= 2;
    if (selectedFilter === "1week") return days >= 0 && days <= 7;
    if (selectedFilter === "expired") return days < 0;
    if (selectedFilter === "critical") return days >= 0 && days <= 3;
    if (selectedFilter === "safe") return days > 7;

    return true;
  });

  // Group products by lowercase name and brand to aggregate batches
  const sortedProducts = [...filteredProducts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groupedProducts: {
    [key: string]: {
      name: string;
      brand: string;
      imageUrl: string;
      multilingualNames: MultilingualName[];
      createdAt: string;
      batches: Product[];
    }
  } = {};

  sortedProducts.forEach((p) => {
    const key = `${p.name.trim().toLowerCase()}_${p.brand.trim().toLowerCase()}`;
    if (!groupedProducts[key]) {
      groupedProducts[key] = {
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl || "",
        multilingualNames: p.multilingualNames || [],
        createdAt: p.createdAt,
        batches: [],
      };
    }
    groupedProducts[key].batches.push(p);
  });

  const groupedProductsList = Object.values(groupedProducts).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen pb-16 flex flex-col antialiased bg-slate-50 text-slate-900" dir={locale === "ar" ? "rtl" : "ltr"}>
      {/* Smart Simulated Notification Toast */}
      <AnimatePresence>
        {showNotificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-[450px] z-50 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-blue-600/10 rounded-xl text-blue-400 mt-0.5">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm tracking-tight text-blue-300 font-display">
                  Smart Expiry Guard
                </h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">{toastMessage}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                  <span>Shift Hour: {notifTime} AM</span>
                  <button
                    onClick={() => setShowNotificationToast(false)}
                    className="text-blue-400 font-medium hover:underline focus:outline-none"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar / Main Header */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" /><path d="m12 13 4 4 4-4" /><path d="M16 17V3" /></svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-800 font-display leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-[9px] sm:text-xs text-slate-500 font-medium leading-none mt-0.5 truncate max-w-[140px] sm:max-w-none">
                <span className="font-semibold text-slate-700">
                  {branches.find(b => b.id === activeBranch)?.name.split(" / ")[0] || activeBranch}
                </span>
                <span className="hidden sm:inline"> • <span className="text-green-600 font-semibold">{t.simulationMode.split(".")[0]}</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Responsive Language Selector */}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-md text-[10px] font-bold">
              {[
                { code: "ar", label: "العربية" },
                { code: "en", label: "EN" },
                { code: "de", label: "DE" },
                { code: "tr", label: "TR" }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLocale(lang.code)}
                  className={`px-2.5 py-1 rounded transition-all text-[10px] font-bold ${locale === lang.code
                    ? "bg-white shadow-xs text-blue-600"
                    : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex md:hidden">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="ar">العربية</option>
                <option value="en">EN</option>
                <option value="de">DE</option>
                <option value="tr">TR</option>
              </select>
            </div>

            {/* Notifications Bell */}
            {(() => {
              const urgentProducts = activeProducts.filter(p => getDaysRemaining(p.expiryDate) <= 3);
              return (
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(v => !v)}
                    className="relative w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                    title={locale === "ar" ? "الإشعارات" : "Notifications"}
                  >
                    <Bell className="w-4 h-4" />
                    {urgentProducts.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                        {urgentProducts.length > 9 ? "9+" : urgentProducts.length}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={`fixed top-16 left-4 right-4 z-50 w-auto md:absolute md:top-11 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ${locale === "ar" ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
                            }`}
                        >
                          {/* Header */}
                          <div className="px-4 py-3 bg-slate-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-bold text-white">
                                {locale === "ar" ? "الإشعارات" : "Notifications"}
                              </span>
                            </div>
                            {urgentProducts.length > 0 && (
                              <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                                {urgentProducts.length} {locale === "ar" ? "تنبيه" : "alerts"}
                              </span>
                            )}
                          </div>

                          {/* Notifications List */}
                          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                            {urgentProducts.length === 0 ? (
                              <div className="py-10 text-center">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-500">
                                  {locale === "ar" ? "لا توجد إشعارات عاجلة" : "No urgent notifications"}
                                </p>
                              </div>
                            ) : (
                              urgentProducts.map(p => {
                                const days = getDaysRemaining(p.expiryDate);
                                const isExpired = days < 0;
                                const isCritical = days >= 0 && days <= 1;
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      setViewingProduct(p);
                                      setNotifOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${isExpired ? "bg-red-500" : isCritical ? "bg-orange-500" : "bg-yellow-400"}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate text-left">{p.name}</p>
                                      <p className="text-[10px] text-slate-500 truncate text-left">{p.brand}</p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${isExpired
                                      ? "bg-red-100 text-red-700"
                                      : isCritical
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-yellow-100 text-yellow-700"
                                      }`}>
                                      {isExpired
                                        ? (locale === "ar" ? "منتهٍ" : "Expired")
                                        : days === 0
                                          ? (locale === "ar" ? "اليوم" : "Today")
                                          : days === 1
                                            ? (locale === "ar" ? "غداً" : "Tomorrow")
                                            : `${days} ${locale === "ar" ? "أيام" : "days"}`}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Footer */}
                          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                            {locale === "ar"
                              ? `${activeProducts.length} منتج نشط في ${branches.find(b => b.id === activeBranch)?.name.split(" / ")[0] || activeBranch}`
                              : `${activeProducts.length} active products in ${branches.find(b => b.id === activeBranch)?.name.split(" / ")[0] || activeBranch}`}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

            {/* User Avatar Badge */}
            <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 shadow-2xs flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 select-none" title={activeEmployee}>
              {activeEmployee ? activeEmployee.trim().slice(0, 2).toUpperCase() : "JD"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Configs & Quick Registration (3 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Tenant / Branch Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-display mb-3">
              <MapPin className="w-4 h-4 text-blue-600" />
              {t.branch} & {t.activeEmployee}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{t.branchSelect}</label>
                <select
                  value={activeBranch}
                  onChange={(e) => setActiveBranch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create new branch inline */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.branchPlaceholder}
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                />
                <button
                  onClick={createBranchHelper}
                  className="bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.createBranch.split(" ")[0]}</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {t.activeEmployee} (Log Traceability)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <User className="w-4 h-4 text-blue-600" />
                  </span>
                  <input
                    type="text"
                    value={activeEmployee}
                    onChange={(e) => setActiveEmployee(e.target.value)}
                    placeholder={t.employeePlaceholder}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:border-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-display mb-4">
              <Database className="w-4 h-4 text-blue-600" />
              {t.statsTitle}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedFilter(selectedFilter === "expired" ? "all" : "expired")}
                className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${
                  selectedFilter === "expired"
                    ? "bg-red-100 border-red-500 shadow-md ring-2 ring-red-500/20"
                    : "bg-red-50 border-red-100 hover:bg-red-100/50"
                }`}
              >
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">{t.statsExpired}</p>
                <p className="text-3xl font-black text-red-700 leading-none">{expiredCount}</p>
              </div>
              <div
                onClick={() => setSelectedFilter(selectedFilter === "critical" ? "all" : "critical")}
                className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${
                  selectedFilter === "critical"
                    ? "bg-orange-100 border-orange-500 shadow-md ring-2 ring-orange-500/20"
                    : "bg-orange-50 border-orange-100 hover:bg-orange-100/50"
                }`}
              >
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">{t.statsWarning}</p>
                <p className="text-3xl font-black text-orange-700 leading-none">{criticalCount}</p>
              </div>
              <div
                onClick={() => setSelectedFilter(selectedFilter === "safe" ? "all" : "safe")}
                className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${
                  selectedFilter === "safe"
                    ? "bg-blue-100 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                    : "bg-blue-50 border-blue-100 hover:bg-blue-100/50"
                }`}
              >
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">{t.statsSafe}</p>
                <p className="text-3xl font-black text-blue-700 leading-none">{safeCount}</p>
              </div>
              <div
                onClick={() => setSelectedFilter("all")}
                className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] border ${
                  selectedFilter === "all"
                    ? "bg-slate-200 border-slate-500 shadow-md ring-2 ring-slate-500/20"
                    : "bg-slate-100 border-slate-200 hover:bg-slate-200/50"
                }`}
              >
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{t.statsTotal}</p>
                <p className="text-3xl font-black text-slate-800 leading-none">{products.length}</p>
              </div>
            </div>
          </div>

          {/* Shift & Notification Config */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-display mb-3">
              <Bell className="w-4 h-4 text-blue-600" />
              {t.notifTitle}
            </h3>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-[11px] leading-relaxed text-slate-500 font-medium">
                {t.appDescription}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t.notifTimeLabel}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Clock className="w-4 h-4" />
                    </span>
                    <input
                      type="time"
                      value={notifTime}
                      onChange={(e) => setNotifTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs font-bold focus:border-blue-500 focus:outline-none bg-slate-50 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    onClick={simulateMorningAlarm}
                    className="bg-blue-600 hover:bg-blue-700 transition-all text-xs font-bold text-white px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <Bell className="w-4 h-4 text-amber-300" />
                    <span>{t.notifBtnTest.split(" ")[1] || "محاكاة"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Active Dashboard Checklist & Registration Panel (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Dual Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative flex-1 flex items-center">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                placeholder={locale === "ar" ? "ابحث باسم المنتج، الماركة، أو تاريخ الصلاحية..." : "Search product, brand, or expiry date..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
              {/* Search by Image Button */}
              <button
                onClick={() => setIsSearchingByImage(true)}
                title={locale === "ar" ? "البحث بالصورة" : "Search by Image"}
                className="absolute right-3.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {/* Launch Register Dialog Button */}
            <button
              onClick={() => setIsRegistering(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-5 h-5 text-white" />
              <span>{t.registerProduct}</span>
            </button>
          </div>

          {/* Registration Dialog Area */}
          <AnimatePresence>
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
              >
                {/* Header of Dialog */}
                <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    <h2 className="font-bold text-sm tracking-tight font-display">{t.registerProduct}</h2>
                  </div>
                  <button
                    onClick={resetForms}
                    className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-Stepper Banner */}
                <div className="bg-slate-50 border-b border-slate-150 px-6 py-3 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${registerStep >= 1 ? "bg-blue-600 text-white font-bold" : "bg-slate-200 text-slate-500"
                        }`}
                    >
                      1
                    </span>
                    <span className={registerStep === 1 ? "text-slate-900 font-bold" : ""}>
                      {locale === "ar" ? "الغلاف والاسم" : "Cover & Name"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${registerStep >= 2 ? "bg-blue-600 text-white font-bold" : "bg-slate-200 text-slate-500"
                        }`}
                    >
                      2
                    </span>
                    <span className={registerStep === 2 ? "text-slate-900 font-bold" : ""}>
                      {locale === "ar" ? "تاريخ الصلاحية" : "Expiry Date"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${registerStep >= 3 ? "bg-blue-600 text-white font-bold" : "bg-slate-200 text-slate-500"
                        }`}
                    >
                      3
                    </span>
                    <span className={registerStep === 3 ? "text-slate-900 font-bold" : ""}>
                      {locale === "ar" ? "التأكيد والحفظ" : "Review & Save"}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 hidden sm:block">
                    {t.simulationAlert}
                  </div>
                </div>

                <div className="p-6">

                  {/* Step 1 Content: Packaging Photo */}
                  {registerStep === 1 && (
                    <div className="space-y-6">
                      <div className="text-center max-w-md mx-auto">
                        <h3 className="font-bold text-slate-800 text-base font-display">{t.step1Title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{t.step1Desc}</p>
                      </div>

                      {/* Photo Capture Area */}
                      <div className="max-w-md mx-auto w-full">

                        {/* Camera capture / upload feed */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col items-center justify-center">
                          <div className="text-center py-6 space-y-4 w-full">
                            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                              <Camera className="w-8 h-8" />
                            </div>

                            <div className="flex flex-col gap-2 max-w-xs mx-auto">
                              <button
                                type="button"
                                onClick={() => startCamera(1)}
                                className="bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Camera className="w-4 h-4 text-amber-400" />
                                {t.snapPhoto}
                              </button>

                              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200">
                                <Upload className="w-4 h-4" />
                                {t.uploadPhoto}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e, 1)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          {packagingImage && (
                            <div className="mt-4 pt-4 border-t border-slate-100 w-full space-y-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={packagingImage}
                                  alt="Package Captured"
                                  className="w-14 h-14 object-cover rounded-lg border border-slate-200 bg-slate-50"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    {locale === "ar" ? "الصورة المحددة" : "Selected Photo"}
                                  </span>
                                  <span className="text-xs text-slate-600 font-medium truncate max-w-[200px] block mt-0.5">
                                    {ocrStatus === "analyzing"
                                      ? (locale === "ar" ? "⏳ جارٍ التحليل بالذكاء الاصطناعي..." : "⏳ Analyzing with AI...")
                                      : (locale === "ar" ? "✅ جاهز للتصنيف" : "✅ Ready")}
                                  </span>
                                </div>
                              </div>
                              {ocrStatus !== "analyzing" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!extractedName) {
                                      setExtractedName("منتج تم تصويره يدوياً");
                                      setExtractedBrand("علامة غير محددة");
                                      setExtractedMultilingual([{ language: "العربية", name: "منتج جديد" }]);
                                    }
                                    setRegisterStep(2);
                                  }}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  {locale === "ar" ? "التالي: إدخال تاريخ الصلاحية ←" : "Next: Enter Expiry Date →"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Step 2 Content: Expiry Date Photo */}
                  {registerStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center max-w-md mx-auto">
                        <h3 className="font-bold text-slate-800 text-base font-display">{t.step2Title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{t.step2Desc}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

                        {/* Auto extracted state preview */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                                EXP
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-700 font-display">
                                  {locale === "ar" ? "البيانات المسجلة للمنتج حتى الآن" : "Product details registered"}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  {extractedBrand} • {extractedName}
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 space-y-2">
                              {extractedMultilingual.map((m, i) => (
                                <div key={i} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-2 text-xs">
                                  <span className="font-bold text-slate-500">{m.language}</span>
                                  <span className="text-slate-800 font-semibold truncate max-w-[150px]">{m.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-200 mt-4">
                            <button
                              onClick={() => setRegisterStep(1)}
                              className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1"
                            >
                              ← {locale === "ar" ? "تعديل الغلاف أو الاسم" : "Edit Cover & Name"}
                            </button>
                          </div>
                        </div>

                        {/* Camera Snap for Expiry */}
                        <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col justify-center">
                          <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                              <Calendar className="w-8 h-8" />
                            </div>

                            <div className="flex flex-col gap-2 max-w-xs mx-auto">
                              <button
                                type="button"
                                onClick={() => startCamera(2)}
                                className="bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Camera className="w-4 h-4 text-amber-400" />
                                {t.snapPhoto}
                              </button>

                              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200">
                                <Upload className="w-4 h-4" />
                                {t.uploadPhoto}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e, 2)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Step 3 Content: Review & Save with Date manual override */}
                  {registerStep === 3 && (
                    <div className="space-y-6">
                      <div className="text-center max-w-md mx-auto">
                        <h3 className="font-bold text-slate-800 text-base font-display">{t.step3Title}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {locale === "ar" ? "راجع تفاصيل المنتج المستخرجة قبل تأكيد الحفظ في الأرشيف والفرع." : "Review details before saving to branch archive."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                        {/* Img preview (4 cols) */}
                        <div className="md:col-span-4 space-y-4">
                          <div className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-xs relative group/img-preview">
                            <img
                              src={packagingImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                              alt="Cover"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-lg">
                              {extractedBrand || "Brand"}
                            </div>
                            {/* Facebook style Cover Edit Button */}
                            <label className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 backdrop-blur-xs text-white rounded-full shadow-lg cursor-pointer transition-all flex items-center justify-center">
                              <Edit className="w-3.5 h-3.5 text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setPackagingImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Extracted form values (8 cols) */}
                        <div className="md:col-span-8 space-y-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              {locale === "ar" ? "الاسم الرئيسي المستخرج" : "Primary Extracted Name"}
                            </span>
                            <input
                              type="text"
                              value={extractedName}
                              onChange={(e) => setExtractedName(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold focus:border-slate-400 focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                {locale === "ar" ? "الشركة المصنعة / الماركة" : "Manufacturer / Brand"}
                              </span>
                              <input
                                type="text"
                                value={extractedBrand}
                                onChange={(e) => setExtractedBrand(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold focus:border-slate-400 focus:outline-none"
                              />
                            </div>

                            {/* QUANTITY AND UNIT OPTIONS */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                {locale === "ar" ? "وحدة الكمية" : "Quantity Unit"}
                              </span>

                              <div className="flex bg-slate-150 p-1 rounded-xl w-full">
                                <button
                                  type="button"
                                  onClick={() => setQuantityUnitInput("pcs")}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${quantityUnitInput === "pcs"
                                      ? "bg-white shadow-xs text-blue-600"
                                      : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                  {t.unitPiece}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuantityUnitInput("cartons")}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${quantityUnitInput === "cartons"
                                      ? "bg-white shadow-xs text-blue-600"
                                      : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                  {t.unitCarton}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* DYNAMIC QUANTITY SUBFIELDS */}
                          {quantityUnitInput === "pcs" ? (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                {locale === "ar" ? "الكمية (عدد القطع يدوياً)" : "Quantity (Manual pieces)"}
                              </span>
                              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white max-w-xs">
                                <button
                                  type="button"
                                  onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={quantityInput}
                                  onChange={(e) => setQuantityInput(e.target.value === "" ? "" as any : Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full text-center border-none text-xs font-semibold py-2 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setQuantityInput(quantityInput + 1)}
                                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    {t.cartonCountLabel}
                                  </span>
                                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <button
                                      type="button"
                                      onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                                      className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={quantityInput}
                                      onChange={(e) => setQuantityInput(e.target.value === "" ? "" as any : Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-full text-center border-none text-xs font-semibold py-2 focus:outline-none font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setQuantityInput(quantityInput + 1)}
                                      className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    {t.itemsPerCartonLabel}
                                  </span>
                                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <button
                                      type="button"
                                      onClick={() => setUnitsPerCartonInput(Math.max(1, unitsPerCartonInput - 1))}
                                      className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={unitsPerCartonInput}
                                      onChange={(e) => setUnitsPerCartonInput(e.target.value === "" ? "" as any : Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-full text-center border-none text-xs font-semibold py-2 focus:outline-none font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setUnitsPerCartonInput(unitsPerCartonInput + 1)}
                                      className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    {t.looseItemsLabel}
                                  </span>
                                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <button
                                      type="button"
                                      onClick={() => setLooseUnitsInput(Math.max(0, looseUnitsInput - 1))}
                                      className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={looseUnitsInput}
                                      onChange={(e) => setLooseUnitsInput(e.target.value === "" ? "" as any : Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-full text-center border-none text-xs font-semibold py-2 focus:outline-none font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setLooseUnitsInput(looseUnitsInput + 1)}
                                      className="px-2 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 text-[11px] flex items-center justify-between text-blue-900 font-bold">
                                <span>{t.totalCalculatedLabel}:</span>
                                <span className="font-black font-mono">
                                  {(quantityInput * unitsPerCartonInput) + looseUnitsInput} {locale === "ar" ? "قطعة" : "pcs"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Date inputs & fallback option */}
                          <div className={extractedExpiryDate ? "bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60" : "bg-amber-50/50 p-4 rounded-xl border border-amber-200/60"}>
                            <label className={`block text-xs font-bold mb-1 ${extractedExpiryDate ? "text-emerald-900" : "text-amber-900"}`}>
                              {extractedExpiryDate ? t.dateSuccessLabel : t.dateFallbackLabel}
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                <Calendar className="w-4 h-4" />
                              </span>
                              <input
                                type="date"
                                value={manualExpiryInput}
                                onChange={(e) => {
                                  setManualExpiryInput(e.target.value);
                                  setRegistrationError(null);
                                }}
                                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs focus:border-slate-400 focus:outline-none bg-white font-medium"
                              />
                            </div>
                          </div>

                          {/* Multilingual labels section (Premium UI) */}
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                              {t.colLanguages}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {extractedMultilingual.map((m, index) => (
                                <div
                                  key={index}
                                  className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1.5"
                                  dir="ltr"
                                >
                                  <span className="font-bold text-[10px] text-slate-500 uppercase">
                                    {m.language}:
                                  </span>
                                  <span className="text-slate-800 font-medium text-xs">{m.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Premium Red Alert for Duplicate Product */}
                      <AnimatePresence>
                        {registrationError && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs overflow-hidden mt-4"
                          >
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                            <div className="flex-1 text-right">
                              <h4 className="text-red-800 font-bold text-xs font-display">
                                {locale === "ar" ? "تنبيه: المنتج مضاف مسبقاً" : "Alert: Product Already Added"}
                              </h4>
                              <p className="text-[11px] text-red-700 font-semibold mt-1 leading-relaxed">
                                {registrationError}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Final Confirm Buttons */}
                      <div className="pt-4 border-t border-slate-150 flex items-center justify-end gap-3 mt-4">
                        <button
                          onClick={resetForms}
                          className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500 transition-colors"
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={finishProductRegistration}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>{t.confirmProduct}</span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Active Analysis Spinner overlay inside registration drawer */}
                  {ocrStatus === "analyzing" && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center z-10 p-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-lg relative overflow-hidden">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-amber-500 animate-pulse" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 mt-4 tracking-tight font-display">
                        {t.analyzing}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                        {locale === "ar" ? "الذكاء الاصطناعي يقوم باستخراج النصوص والماركات والتواريخ المسجلة بدقة..." : "Gemini is performing rapid visual extraction of names, languages, and dates."}
                      </p>
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DUPLICATE FLAVOR COMPARISON SCREEN (3.c Section) */}
          <AnimatePresence>
            {duplicateFound && pendingProduct && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200"
                >
                  <div className="p-6 bg-red-600 text-white flex items-start gap-3">
                    <div className="p-2 bg-white/10 rounded-xl shrink-0">
                      <AlertTriangle className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight font-display">
                        {t.duplicateTitle}
                      </h2>
                      <p className="text-xs text-red-100 mt-0.5">
                        {t.duplicateDesc}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Multilingual matching text banner */}
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
                        Matched Product Base Info
                      </div>
                      <h4 className="font-bold text-slate-800 text-base">
                        {pendingProduct.brand} - {pendingProduct.name}
                      </h4>
                      <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-500">
                        <span>Expiry Date: <span className="font-mono text-red-600 font-bold">{pendingProduct.expiryDate}</span></span>
                        <span>Proposed Quantity: <span className="font-mono font-bold text-slate-800">+{pendingProduct.quantity}</span></span>
                      </div>
                    </div>

                    {/* Dual Visual Side-by-Side Images */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Old visual record */}
                      <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          [1] {t.duplicateCompareOld}
                        </span>
                        <div className="aspect-square rounded-xl bg-white border border-slate-200 overflow-hidden relative shadow-xs flex items-center justify-center bg-slate-50">
                          <Package className="w-10 h-10 text-slate-350" />
                          <img
                            src={duplicateFound.imageUrl}
                            alt="Old product image"
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-lg z-20">
                            Qty: {duplicateFound.quantity}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700">Name:</span> {duplicateFound.name}
                        </div>
                      </div>

                      {/* New visual record */}
                      <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          [2] {t.duplicateCompareNew}
                        </span>
                        <div className="aspect-square rounded-xl bg-white border border-slate-200 overflow-hidden relative shadow-xs flex items-center justify-center bg-slate-50">
                          <Package className="w-10 h-10 text-slate-355" />
                          <img
                            src={pendingProduct.imageUrl}
                            alt="New captured product image"
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-lg z-20">
                            Qty: {pendingProduct.quantity}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700">Name:</span> {pendingProduct.name}
                        </div>
                      </div>

                    </div>

                    {/* Action buttons as specified */}
                    <div className="flex flex-col sm:flex-row items-stretch justify-end gap-3 pt-4 border-t border-slate-150">
                      <button
                        onClick={resetForms}
                        className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        {t.cancel}
                      </button>

                      {/* Button Same Product (Increments Quantity) */}
                      <button
                        onClick={resolveDuplicateWithMerge}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>{t.btnSameProduct}</span>
                      </button>

                      {/* Button Different Sorte/Flavor (Saves independent record) */}
                      <button
                        onClick={resolveDuplicateWithSeparate}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{t.btnDifferentFlavor}</span>
                      </button>
                    </div>

                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PRODUCT DETAIL MODAL */}
          <AnimatePresence>
            {viewingProduct && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setViewingProduct(null)}
              >
                <motion.div
                  initial={{ scale: 0.93, y: 24 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.93, y: 24 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/40 z-0" />
                    {viewingProduct.imageUrl && (
                      <img
                        src={viewingProduct.imageUrl}
                        alt={viewingProduct.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 z-10 cursor-pointer hover:opacity-50 transition-opacity"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          setViewingFullImage(viewingProduct.imageUrl);
                          setViewingFullImageGroupProducts([viewingProduct]);
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={() => { setViewingProduct(null); startEditing(viewingProduct); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {locale === "ar" ? "تعديل" : "Edit"}
                      </button>
                      <button
                        onClick={() => { setViewingProduct(null); setDeletingProductId(viewingProduct.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {locale === "ar" ? "حذف" : "Delete"}
                      </button>
                      <button
                        onClick={() => setViewingProduct(null)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-5 right-5 flex items-end gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl border-2 border-white/30 shadow-xl shrink-0 bg-slate-800 flex items-center justify-center overflow-hidden relative cursor-pointer hover:scale-105 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (viewingProduct.imageUrl) {
                            setViewingFullImage(viewingProduct.imageUrl);
                            setViewingFullImageGroupProducts([viewingProduct]);
                          }
                        }}
                      >
                        <Package className="w-6 h-6 text-slate-500" />
                        {viewingProduct.imageUrl && (
                          <img
                            src={viewingProduct.imageUrl}
                            alt={viewingProduct.name}
                            className="absolute inset-0 w-full h-full object-cover z-10"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{viewingProduct.brand}</p>
                        <h2 className="text-lg font-black text-white leading-tight truncate">{viewingProduct.name}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const days = getDaysRemaining(viewingProduct.expiryDate);
                        const bStyle = getBadgeStyle(days);
                        return (
                          <>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{locale === "ar" ? "الكمية" : "Quantity"}</p>
                              <p className="text-xl font-black text-slate-800">
                                {viewingProduct.quantityUnit === "cartons"
                                  ? Math.floor((viewingProduct.quantity - (viewingProduct.looseUnits || 0)) / (viewingProduct.unitsPerCarton || 12))
                                  : viewingProduct.quantity}
                                <span className="text-xs font-bold text-slate-500 ms-1">
                                  {viewingProduct.quantityUnit === "cartons" ? t.unitCarton : t.unitPiece}
                                </span>
                              </p>
                              {viewingProduct.quantityUnit === "cartons" && (
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">
                                  {viewingProduct.quantity} {t.unitPiece} ({viewingProduct.unitsPerCarton} × {Math.floor((viewingProduct.quantity - (viewingProduct.looseUnits || 0)) / (viewingProduct.unitsPerCarton || 12))} {viewingProduct.looseUnits ? `+ ${viewingProduct.looseUnits}` : ""})
                                </p>
                              )}
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{locale === "ar" ? "تاريخ الانتهاء" : "Expiry Date"}</p>
                              <p className="text-sm font-black text-slate-800 font-mono">{viewingProduct.expiryDate.split("-").reverse().join(".")}</p>
                            </div>
                            <div className={`rounded-2xl p-3 text-center border ${bStyle.bg}`}>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{locale === "ar" ? "الحالة" : "Status"}</p>
                              <div className="flex items-center justify-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${bStyle.dot}`} />
                                <p className="text-xs font-black">{bStyle.label}</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Multilingual Names */}
                    {viewingProduct.multilingualNames.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Languages className="w-3.5 h-3.5" />
                          {locale === "ar" ? "الأسماء بكل اللغات" : "Multilingual Names"}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {viewingProduct.multilingualNames.map((m, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{m.language}</span>
                              <span className="text-xs font-bold text-slate-700">{m.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expiry Image */}
                    {viewingProduct.expiryImageUrl && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          {locale === "ar" ? "صورة تاريخ الصلاحية" : "Expiry Date Image"}
                        </p>
                        <img
                          src={viewingProduct.expiryImageUrl}
                          alt="Expiry"
                          className="w-full max-h-32 object-contain rounded-xl border border-slate-200 bg-slate-50"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Activity Logs */}
                    {viewingProduct.logs && viewingProduct.logs.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {locale === "ar" ? "سجل النشاط" : "Activity Log"}
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {[...viewingProduct.logs].reverse().map((log, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px]">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${log.action === "created" ? "bg-blue-500" :
                                  log.action === "sold" ? "bg-green-500" :
                                    log.action === "shelf_checked" ? "bg-emerald-500" : "bg-purple-500"
                                  }`} />
                                <span className="font-bold text-slate-700">{log.employeeName}</span>
                                <span className="text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-md text-[10px]">{log.action}</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(log.timestamp).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expiry Action Buttons (Sold, Checked, Handled) inside detail modal */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 justify-start">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                        <span>{locale === "ar" ? "أزرار التحكم والإجراءات" : "Control Actions & Updates"}</span>
                      </p>
                      <div className="flex flex-col gap-1.5 w-full">
                        {/* Row 1: Sold, Checked, Handled */}
                        <div className="flex gap-1.5 w-full">
                          <button
                            onClick={() => {
                              handleProductAction(viewingProduct.id, "sold");
                              setViewingProduct(null); // Close modal on action
                            }}
                            title={t.actionSold}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[10px] md:text-xs font-black shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>{t.actionSold}</span>
                          </button>
                          <button
                            onClick={() => {
                              handleProductAction(viewingProduct.id, "shelf_checked");
                              setViewingProduct(null); // Close modal on action
                            }}
                            title={t.actionChecked}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-[10px] md:text-xs font-bold border border-slate-200 shadow-sm transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{t.actionChecked.split(" ")[0]}</span>
                          </button>
                          <button
                            onClick={() => {
                              handleProductAction(viewingProduct.id, "handled");
                              setViewingProduct(null); // Close modal on action
                            }}
                            title={t.actionHandled}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 active:scale-95 text-white text-[10px] md:text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-blue-400" />
                            <span>{t.actionHandled}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{locale === "ar" ? "تاريخ الإضافة" : "Created At"}</span>
                        <span className="font-bold text-slate-700">{new Date(viewingProduct.createdAt).toLocaleDateString(locale)}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{locale === "ar" ? "آخر تحديث" : "Updated At"}</span>
                        <span className="font-bold text-slate-700">{new Date(viewingProduct.updatedAt).toLocaleDateString(locale)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setViewingProduct(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      {locale === "ar" ? "إغلاق" : "Close"}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setViewingProduct(null); setDeletingProductId(viewingProduct.id); }}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {locale === "ar" ? "حذف" : "Delete"}
                      </button>
                      <button
                        onClick={() => { setViewingProduct(null); startEditing(viewingProduct); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {locale === "ar" ? "تعديل المنتج" : "Edit Product"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DELETE CONFIRMATION DIALOG */}
          <AnimatePresence>
            {deletingProductId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setDeletingProductId(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-base font-black text-slate-800 text-center mb-1">
                    {locale === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                  </h3>
                  <p className="text-xs text-slate-500 text-center mb-6">
                    {locale === "ar"
                      ? "هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذه العملية."
                      : "Are you sure you want to delete this product? This action cannot be undone."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeletingProductId(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      {locale === "ar" ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      onClick={() => deleteProduct(deletingProductId)}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                    >
                      {locale === "ar" ? "حذف نهائياً" : "Delete"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EDIT PRODUCT OVERLAY DIALOG */}
          <AnimatePresence>
            {editingProduct && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200"
                >
                  <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-white" />
                      <div>
                        <h2 className="text-sm font-bold tracking-tight font-display">
                          {t.editProductTitle}
                        </h2>
                        <p className="text-[10px] text-blue-100">
                          {t.editProductDesc}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={cancelEditing}
                      className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Main Name & Brand */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {locale === "ar" ? "اسم المنتج الرئيسي" : "Primary Product Name"}
                        </label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {locale === "ar" ? "الشركة المصنعة / الماركة" : "Manufacturer / Brand"}
                        </label>
                        <input
                          type="text"
                          value={editingBrand}
                          onChange={(e) => setEditingBrand(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Expiry Date & Quantity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {t.colExpiry}
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <Calendar className="w-4 h-4" />
                          </span>
                          <input
                            type="date"
                            value={editingExpiryDate}
                            onChange={(e) => setEditingExpiryDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {locale === "ar" ? "وحدة وحساب الكمية" : "Quantity Unit & Calculation"}
                        </label>

                        {/* Segmented Unit Selector */}
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full">
                          <button
                            type="button"
                            onClick={() => setEditingQuantityUnit("pcs")}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${editingQuantityUnit === "pcs"
                                ? "bg-white shadow-xs text-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                              }`}
                          >
                            {t.unitPiece}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuantityUnit("cartons")}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${editingQuantityUnit === "cartons"
                                ? "bg-white shadow-xs text-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                              }`}
                          >
                            {t.unitCarton}
                          </button>
                        </div>

                        {editingQuantityUnit === "pcs" ? (
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => setEditingQuantity(Math.max(1, editingQuantity - 1))}
                              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={editingQuantity}
                              onChange={(e) => setEditingQuantity(e.target.value === "" ? "" as any : Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full text-center border-none text-xs font-semibold py-2 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingQuantity(editingQuantity + 1)}
                              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  {t.cartonCountLabel}
                                </span>
                                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuantity(Math.max(1, editingQuantity - 1))}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={editingQuantity}
                                    onChange={(e) => setEditingQuantity(e.target.value === "" ? "" as any : Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full text-center border-none text-xs font-semibold py-1 focus:outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuantity(editingQuantity + 1)}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  {t.itemsPerCartonLabel}
                                </span>
                                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                  <button
                                    type="button"
                                    onClick={() => setEditingUnitsPerCarton(Math.max(1, editingUnitsPerCarton - 1))}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={editingUnitsPerCarton}
                                    onChange={(e) => setEditingUnitsPerCarton(e.target.value === "" ? "" as any : Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full text-center border-none text-xs font-semibold py-1 focus:outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingUnitsPerCarton(editingUnitsPerCarton + 1)}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  {t.looseItemsLabel}
                                </span>
                                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                  <button
                                    type="button"
                                    onClick={() => setEditingLooseUnits(Math.max(0, editingLooseUnits - 1))}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    value={editingLooseUnits}
                                    onChange={(e) => setEditingLooseUnits(e.target.value === "" ? "" as any : Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full text-center border-none text-xs font-semibold py-1 focus:outline-none font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingLooseUnits(editingLooseUnits + 1)}
                                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2 text-[10px] flex items-center justify-between text-blue-900 font-bold">
                              <span>{t.totalCalculatedLabel}:</span>
                              <span className="font-black font-mono">
                                {(editingQuantity * editingUnitsPerCarton) + editingLooseUnits} {locale === "ar" ? "قطعة" : "pcs"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Multilingual Names Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {t.colLanguages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingMultilingual([...editingMultilingual, { language: "EN", name: "" }])}
                          className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{locale === "ar" ? "إضافة ترجمة" : "Add Language"}</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {editingMultilingual.map((m, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder={locale === "ar" ? "اللغة (مثال: العربية)" : "Language (e.g. Arabic)"}
                              value={m.language}
                              onChange={(e) => {
                                const copy = [...editingMultilingual];
                                copy[index].language = e.target.value;
                                setEditingMultilingual(copy);
                              }}
                              className="w-1/4 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder={locale === "ar" ? "اسم المنتج بهذه اللغة" : "Product Name in this language"}
                              value={m.name}
                              onChange={(e) => {
                                const copy = [...editingMultilingual];
                                copy[index].name = e.target.value;
                                setEditingMultilingual(copy);
                              }}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const copy = editingMultilingual.filter((_, idx) => idx !== index);
                                setEditingMultilingual(copy);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {editingMultilingual.length === 0 && (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">
                            {locale === "ar" ? "لا توجد ترجمات مضافة حالياً." : "No translation names configured."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={saveEditedProduct}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-white" />
                      <span>{t.saveChanges}</span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Filtering Tabs */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200 flex flex-wrap items-center gap-2 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>{t.colActions.split(" ")[0]}</span>
            </div>

            {[
              { id: "all", label: t.filterAll },
              { id: "today", label: t.filterToday },
              { id: "tomorrow", label: t.filterTomorrow },
              { id: "2days", label: t.filter2Days },
              { id: "1week", label: t.filter1Week },
              { id: "archive", label: locale === "ar" ? "الأرشيف (المباعة/المكتملة)" : "Archive (Sold/Handled)" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFilter === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════
               PREMIUM PRODUCT SHELF — $20K LEVEL DESIGN
          ═══════════════════════════════════════════════════════ */}
          <div className="relative">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    {locale === "ar" ? "قائمة المنتجات النشطة بالرفوف" : "Active Shelf Products"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {locale === "ar" ? "الأوراق الحالية للفحص والمراجعة" : "Live inventory · Click any card for full details"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {filteredProducts.length} {locale === "ar" ? "منتج" : "products"}
                </div>
              </div>
            </div>

            {/* Shelf Items */}
            {isLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row gap-4">
                    <div className="w-full h-44 md:h-28 md:w-36 rounded-2xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-slate-200 rounded w-1/4" />
                      <div className="h-6 bg-slate-200 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : groupedProductsList.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <CheckCircle className="w-10 h-10 text-slate-300" />
                </div>
                <h4 className="font-black text-slate-800 text-base mb-1">
                  {locale === "ar" ? "الرفوف نظيفة تماماً!" : "Shelf is clear!"}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {locale === "ar" ? "لا توجد منتجات مسجلة تطابق فلترة التواريخ النشطة حالياً." : "No registered active products match this date interval filter."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <AnimatePresence initial={false}>
                  {groupedProductsList.map((group, groupIdx) => {
                    const totalGroupQuantity = group.batches.reduce((sum, b) => sum + b.quantity, 0);
                    // Use details from the first batch
                    const firstBatch = group.batches[0];
                    const firstBatchUnit = firstBatch.quantityUnit || "pcs";
                    
                    return (
                      <motion.div
                        key={`${group.name}_${group.brand}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: groupIdx * 0.035, type: "spring", stiffness: 340, damping: 30 }}
                        className="group relative flex flex-col md:flex-row items-stretch bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-250 overflow-hidden"
                        dir={locale === "ar" ? "rtl" : "ltr"}
                      >
                        {/* Left/Top Urgency accent bar using nearest batch */}
                        {(() => {
                          const nearestBatch = [...group.batches].sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate))[0];
                          const daysLeft = getDaysRemaining(nearestBatch.expiryDate);
                          const isCritical = daysLeft < 0;
                          const isExpiring = daysLeft >= 0 && daysLeft <= 1;
                          const isWarning = daysLeft >= 2 && daysLeft <= 3;
                          const isWeek = daysLeft >= 4 && daysLeft <= 7;
                          const leftBarColor = isCritical
                            ? "bg-red-600 animate-pulse"
                            : isExpiring
                              ? "bg-red-500 animate-pulse"
                              : isWarning
                                ? "bg-orange-500"
                                : isWeek
                                  ? "bg-amber-500"
                                  : "bg-emerald-500";
                          return <div className={`w-full h-1.5 md:w-1.5 md:h-auto shrink-0 ${leftBarColor}`} />;
                        })()}

                        {/* ── IMAGE ── */}
                        <div
                          className="relative w-full h-44 md:h-auto md:w-40 shrink-0 cursor-pointer overflow-hidden bg-slate-100"
                          onClick={() => {
                            setViewingFullImage(group.imageUrl);
                            setViewingFullImageGroupProducts(group.batches);
                          }}
                          title={locale === "ar" ? "اضغط لعرض الصورة كاملة" : "Click to view full image"}
                        >
                          {/* Graceful Package Placeholder Fallback */}
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                            <Package className="w-10 h-10 text-slate-300" />
                          </div>
                          {group.imageUrl && (
                            <img
                              src={group.imageUrl}
                              alt={group.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out z-10"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[9px] font-black shadow-lg backdrop-blur-xs bg-slate-900/60 py-0.5 px-2 rounded-full">
                            <span>{locale === "ar" ? "مجموع:" : "Total:"}</span>
                            <span className="font-mono">{formatQuantity(totalGroupQuantity, firstBatchUnit, firstBatch.unitsPerCarton, firstBatch.looseUnits)}</span>
                          </div>
                        </div>

                        {/* ── INFO & BATCHES NESTED CONTAINER ── */}
                        <div className="flex-1 min-w-0 p-5 flex flex-col justify-between gap-4">
                          {/* Product Header */}
                          <div className="cursor-pointer" onClick={() => setViewingProduct(firstBatch)}>
                            <div className="flex items-center gap-2 mb-1">
                              {group.brand && (
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                  {group.brand}
                                </span>
                              )}
                              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-200/50">
                                {group.batches.length} {locale === "ar" ? "دفعة/تاريخ" : group.batches.length === 1 ? "batch" : "batches"}
                              </span>
                            </div>
                            <h4 className="font-black text-slate-900 text-base leading-tight tracking-tight hover:text-blue-700 transition-colors">
                              {group.name}
                            </h4>
                            
                            {/* Multilingual names */}
                            {group.multilingualNames.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {group.multilingualNames.slice(0, 3).map((m, i) => (
                                  <span key={i} className="text-[9px] font-semibold bg-slate-50 text-slate-400 border border-slate-200/60 px-1.5 py-0.2 rounded uppercase">
                                    {m.language}: {m.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* List of Batches ("بقلب بعضو" - nested list) */}
                          <div className="border-t border-slate-100 pt-3 space-y-3.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {locale === "ar" ? "تواريخ الصلاحية والكميات الحالية:" : "Expiry Dates & Quantities:"}
                            </p>
                            
                            <div className="space-y-2">
                              {group.batches.map((b) => {
                                const daysLeft = getDaysRemaining(b.expiryDate);
                                const bStyle = getBadgeStyle(daysLeft);
                                const isCritical = daysLeft < 0;
                                const isExpiring = daysLeft >= 0 && daysLeft <= 1;
                                const isWarning = daysLeft >= 2 && daysLeft <= 3;
                                const isWeek = daysLeft >= 4 && daysLeft <= 7;

                                const uc = isCritical
                                  ? { accent: "#dc2626", accentDim: "#fca5a580", badge: "bg-red-600", dateColor: "#dc2626", dateBg: "#fff1f2", dateBorder: "#fecdd3" }
                                  : isExpiring
                                    ? { accent: "#ef4444", accentDim: "#fca5a540", badge: "bg-red-500", dateColor: "#dc2626", dateBg: "#fff1f2", dateBorder: "#fecdd3" }
                                    : isWarning
                                      ? { accent: "#f97316", accentDim: "#fed7aa40", badge: "bg-orange-500", dateColor: "#ea580c", dateBg: "#fff7ed", dateBorder: "#fed7aa" }
                                      : isWeek
                                        ? { accent: "#f59e0b", accentDim: "#fde68a40", badge: "bg-amber-500", dateColor: "#b45309", dateBg: "#fffbeb", dateBorder: "#fde68a" }
                                        : { accent: "#10b981", accentDim: "#6ee7b740", badge: "bg-emerald-500", dateColor: "#059669", dateBg: "#f0fdf4", dateBorder: "#a7f3d0" };

                                const maxDays = 30;
                                const clampedDays = Math.max(0, Math.min(daysLeft, maxDays));
                                const pct = isCritical ? 0 : clampedDays / maxDays;
                                const r = 14, circ = 2 * Math.PI * r;
                                const dash = pct * circ;

                                return (
                                  <div
                                    key={b.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-2xl transition-all"
                                  >
                                    {/* Date & Urgency badge */}
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Small countdown circle */}
                                      <div className="relative w-8 h-8 shrink-0">
                                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                                          <circle cx="18" cy="18" r={r} fill="none" stroke={uc.accentDim} strokeWidth="2.5" />
                                          <circle
                                            cx="18" cy="18" r={r}
                                            fill="none"
                                            stroke={uc.accent}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeDasharray={`${dash} ${circ}`}
                                            style={{ transition: "stroke-dasharray 1.2s" }}
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-[10px] font-black" style={{ color: uc.dateColor }}>
                                            {isCritical ? "✕" : daysLeft > 99 ? "∞" : daysLeft}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="min-w-0">
                                        {/* Expiry date badge */}
                                        <div
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[10px] font-bold font-mono"
                                          style={{ backgroundColor: uc.dateBg, borderColor: uc.dateBorder, color: uc.dateColor }}
                                        >
                                          <Calendar className="w-2.5 h-2.5" />
                                          {locale === "ar" ? "ينتهي:" : "Exp:"} {b.expiryDate.split("-").reverse().join(".")}
                                        </div>
                                        {/* Specific batch quantity */}
                                        <div className="text-[10px] text-slate-500 font-semibold mt-1">
                                          {locale === "ar" ? "الكمية في هذا التاريخ: " : "Qty: "}
                                          <span className="text-slate-800 font-bold">{formatQuantity(b.quantity, b.quantityUnit, b.unitsPerCarton, b.looseUnits)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons for this specific batch (Reverted to the old wide design with text) */}
                                    <div className="flex flex-col gap-1.5 w-full sm:w-auto min-w-[200px] sm:min-w-[280px]" onClick={(e) => e.stopPropagation()}>
                                      {/* Row 1: Sold, Checked, Handled OR Restore */}
                                      <div className="flex gap-1.5 w-full">
                                        {b.status !== "active" ? (
                                          <button
                                            onClick={() => handleProductRestore(b.id)}
                                            title={locale === "ar" ? "إعادة المنتج للرف النشط" : "Restore to active shelf"}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>{locale === "ar" ? "إرجاع للرف النشط" : "Restore to shelf"}</span>
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => handleProductAction(b.id, "sold")}
                                              title={t.actionSold}
                                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[9px] md:text-[10px] font-black shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                                            >
                                              <ShoppingCart className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                              <span>{t.actionSold}</span>
                                            </button>
                                            <button
                                              onClick={() => handleProductAction(b.id, "shelf_checked")}
                                              title={t.actionChecked}
                                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-[9px] md:text-[10px] font-bold border border-slate-200 shadow-sm transition-all cursor-pointer"
                                            >
                                              <CheckCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500" />
                                              <span>{t.actionChecked.split(" ")[0]}</span>
                                            </button>
                                            <button
                                              onClick={() => handleProductAction(b.id, "handled")}
                                              title={t.actionHandled}
                                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 active:scale-95 text-white text-[9px] md:text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                                            >
                                              <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-400" />
                                              <span>{t.actionHandled}</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                      {/* Row 2: Edit / Delete */}
                                      <div className="flex gap-1.5 w-full">
                                        <button
                                          onClick={() => startEditing(b)}
                                          title={locale === "ar" ? "تعديل" : "Edit"}
                                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-600 text-[9px] font-bold border border-blue-200 transition-all cursor-pointer"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                          <span>{locale === "ar" ? "تعديل" : "Edit"}</span>
                                        </button>
                                        <button
                                          onClick={() => setDeletingProductId(b.id)}
                                          title={locale === "ar" ? "حذف" : "Delete"}
                                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 active:scale-95 text-red-500 text-[9px] font-bold border border-red-200 transition-all cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>{locale === "ar" ? "حذف" : "Delete"}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Daily Action Logs list */}
          {/* Daily Action Logs list */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm font-display flex items-center gap-2 mb-3">
              <FileText className="w-4.5 h-4.5 text-slate-500" />
              {t.logTitle}
            </h3>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">{t.logEmpty}</p>
              ) : (
                logs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const getActionLabel = (action: string) => {
                    switch (action) {
                      case "sold":
                        return t.actionSold;
                      case "shelf_checked":
                        return t.actionChecked.split(" ")[0];
                      case "handled":
                        return t.actionHandled;
                      case "created":
                        return t.actionCreated;
                      case "deleted":
                        return locale === "ar" ? "تم الحذف" : "Deleted";
                      case "restored":
                        return locale === "ar" ? "تم الاسترجاع" : "Restored";
                      case "quantity_incremented":
                        return t.actionIncremented;
                      default:
                        return action;
                    }
                  };

                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl text-xs"
                      dir={locale === "ar" ? "rtl" : "ltr"}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${log.action === "created" ? "bg-blue-500" :
                          log.action === "sold" ? "bg-green-500" :
                            log.action === "shelf_checked" ? "bg-emerald-500" :
                              log.action === "deleted" ? "bg-red-500" :
                                log.action === "restored" ? "bg-cyan-500" : "bg-purple-500"
                          }`} />
                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">
                            {log.brand} - {log.productName}
                          </span>
                          <span className="text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded-md font-medium text-[10px] border border-slate-200/50">
                            {getActionLabel(log.action)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold font-mono shrink-0">
                        {t.logFormat.replace("{employee}", log.employeeName).replace("{time}", dateStr)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer Notification Area */}
      <footer className="h-12 bg-slate-900 text-white px-6 flex items-center justify-between flex-shrink-0 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <p className="font-bold tracking-wide uppercase">
            {locale === "ar"
              ? `التنبيه اليومي التالي: في تمام الساعة ${notifTime} صباحاً`
              : `Next Daily Alert: at ${notifTime} AM`}
          </p>
        </div>
        <div className="flex items-center gap-6 font-medium text-slate-400">
          <span className="hidden sm:inline">Storage: 4.2 GB / 20 GB</span>
          <span>App Version: v2.4.1 Premium</span>
        </div>
      </footer>
      {/* Full Screen Image Preview Modal */}
      <AnimatePresence>
        {viewingFullImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => {
              setViewingFullImage(null);
              setViewingFullImageGroupProducts([]);
            }}
          >
            <button
              onClick={() => {
                setViewingFullImage(null);
                setViewingFullImageGroupProducts([]);
              }}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative flex flex-col items-center justify-center max-w-full max-h-[85vh]">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Package className="w-20 h-20 text-slate-650" />
                <span className="text-xs font-bold">{locale === "ar" ? "تعذر تحميل الصورة" : "Image failed to load"}</span>
              </div>
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={viewingFullImage}
                alt="Full Preview"
                className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-2xl shadow-2xl z-10"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              
              {/* Edit Image Action Controls at bottom of fullscreen modal */}
              {viewingFullImageGroupProducts.length > 0 && (
                <div
                  className="mt-6 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700/50 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs font-bold text-slate-300">
                    {locale === "ar" ? "تغيير صورة المنتج:" : "Change product image:"}
                  </span>
                  
                  <button
                    onClick={() => {
                      setViewingFullImage(null); // Close modal before starting camera
                      startCamera(4);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/25"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>{locale === "ar" ? "الكاميرا" : "Camera"}</span>
                  </button>
                  
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all border border-slate-600 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{locale === "ar" ? "رفع صورة" : "Upload Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            updateGroupProductsImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search by Image Options Modal */}
      <AnimatePresence>
        {isSearchingByImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  {locale === "ar" ? "البحث بالصورة" : "Search by Image"}
                </h3>
                <button
                  onClick={() => setIsSearchingByImage(false)}
                  className="p-1 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-center py-4 space-y-4">
                <p className="text-xs text-slate-500">
                  {locale === "ar"
                    ? "قم بالتقاط صورة للمنتج أو رفعه للبحث عنه تلقائياً باستخدام الذكاء الاصطناعي."
                    : "Take a photo or upload product packaging to search automatically using AI."}
                </p>
                
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setIsSearchingByImage(false);
                      startCamera(3); // Start camera in search mode
                    }}
                    className="bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    {t.snapPhoto}
                  </button>

                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200">
                    <Upload className="w-4 h-4" />
                    {t.uploadPhoto}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            triggerImageSearch(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen WhatsApp-like Camera Overlay */}
      <div
        className={`fixed inset-0 z-[100] bg-black flex flex-col justify-between ${
          cameraActive && cameraStep ? "flex" : "hidden"
        }`}
      >
        {/* Top Toolbar */}
        <div className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent z-10">
          <button
            onClick={stopCamera}
            className="p-2.5 bg-black/40 hover:bg-black/60 rounded-full transition-all text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-xs font-black tracking-widest text-slate-300 uppercase">
            {cameraStep === 1
              ? (locale === "ar" ? "تصوير المنتج" : "Capture Product")
              : cameraStep === 2
                ? (locale === "ar" ? "قراءة تاريخ الصلاحية" : "Scan Expiry Date")
                : cameraStep === 3
                  ? (locale === "ar" ? "البحث بالصورة" : "Visual Search")
                  : (locale === "ar" ? "تعديل صورة المنتج" : "Edit Product Image")}
          </div>

          <div className="flex gap-2">
            {/* Flash Toggle */}
            <button
              onClick={toggleFlash}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${
                flashOn ? "bg-amber-400 text-slate-900 shadow-md shadow-amber-400/30" : "bg-black/40 hover:bg-black/60 text-white"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={flashOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 L3 14 H12 L11 22 L21 10 H12 Z"/></svg>
            </button>
            {/* Switch Camera */}
            <button
              onClick={toggleFacingMode}
              className="p-2.5 bg-black/40 hover:bg-black/60 rounded-full transition-all text-white cursor-pointer"
            >
              <RefreshCw className="w-5.5 h-5.5" />
            </button>
          </div>
        </div>

        {/* Video Feed with Camera Grid lines */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
          />
          
          {/* Camera Grid Lines Overlay (WhatsApp style) */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>
        </div>

        {/* Bottom Shutter Area */}
        <div className="p-8 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent z-10">
          <button
            onClick={capturePhoto}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer transition-all hover:scale-105 active:scale-95 bg-transparent"
          >
            <div className="w-full h-full rounded-full bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
}