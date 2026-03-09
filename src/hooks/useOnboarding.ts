import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanySlug } from "@/hooks/useCompanySlug";
import { useState, useCallback, useMemo } from "react";

export interface TourStep {
  id: string;
  featureKey: string;
  targetSelector: string;
  title: string;
  description: string;
  sidebarPath?: string;
}

const ALL_TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    featureKey: "dashboard",
    targetSelector: '[data-tour="dashboard"]',
    title: "Dashboard",
    description:
      "Ini adalah pusat kontrol workspace Anda. Dashboard menampilkan ringkasan aktivitas terkini, statistik task, progress project, dan update penting dari tim Anda. Semua data di sini hanya milik workspace Anda.",
  },
  {
    id: "projects",
    featureKey: "projects",
    targetSelector: '[data-tour="projects"]',
    title: "Project Management",
    description:
      "Kelola seluruh project tim Anda di sini. Anda bisa membuat project baru, menetapkan deadline, menambahkan anggota tim, dan memantau progress melalui status project. Setiap project terhubung dengan client dan task.",
  },
  {
    id: "tasks",
    featureKey: "tasks",
    targetSelector: '[data-tour="tasks"]',
    title: "Task Management",
    description:
      "Task digunakan untuk melacak pekerjaan, menugaskan tanggung jawab, dan memantau progress. Anda bisa mengatur prioritas, due date, assignee, serta memantau status setiap task yang berjalan.",
  },
  {
    id: "clients",
    featureKey: "clients",
    targetSelector: '[data-tour="clients"]',
    title: "Client Management",
    description:
      "Kelola semua client Anda di sini. Anda bisa menambahkan client baru, menghubungkan mereka ke project, mengelola kontrak, dokumen, dan memantau aktivitas terkait setiap client.",
  },
  {
    id: "team",
    featureKey: "team",
    targetSelector: '[data-tour="team"]',
    title: "Team Management",
    description:
      "Lihat dan kelola anggota tim workspace Anda. Anda bisa mengatur role dan hak akses setiap anggota, memantau data karyawan, dan mengelola struktur organisasi.",
  },
  {
    id: "finance",
    featureKey: "finance",
    targetSelector: '[data-tour="finance"]',
    title: "Finance",
    description:
      "Modul keuangan untuk mengelola pemasukan, pengeluaran, payroll, dan reimbursement. Anda bisa melacak arus kas, membuat laporan keuangan, serta memantau kesehatan finansial workspace.",
  },
  {
    id: "asset",
    featureKey: "asset",
    targetSelector: '[data-tour="asset"]',
    title: "Asset Management",
    description:
      "Kelola inventaris dan aset perusahaan. Anda bisa mencatat checkout dan checkin aset, melacak lokasi, dan memantau kondisi setiap aset yang dimiliki workspace.",
  },
  {
    id: "schedule",
    featureKey: "schedule",
    targetSelector: '[data-tour="schedule"]',
    title: "Schedule",
    description:
      "Lihat jadwal dan timeline seluruh kegiatan tim. Schedule menampilkan deadline project, shooting, meeting, dan event dalam tampilan kalender yang terorganisir.",
  },
  {
    id: "personal_notes",
    featureKey: "personal_notes",
    targetSelector: '[data-tour="personal_notes"]',
    title: "Personal Notes",
    description:
      "Buat catatan pribadi Anda di sini. Notes mendukung formatted text, tabel, dan structured writing. Catatan bersifat privat dan hanya bisa dilihat oleh Anda.",
  },
  {
    id: "reports",
    featureKey: "reports",
    targetSelector: '[data-tour="reports"]',
    title: "Reports & Analytics",
    description:
      "Dapatkan insight tentang produktivitas, performa tim, dan progress project melalui laporan dan analitik. Data disesuaikan dengan aktivitas workspace Anda.",
  },
  {
    id: "settings",
    featureKey: "dashboard",
    targetSelector: '[data-tour="settings"]',
    title: "Settings",
    description:
      "Kelola pengaturan workspace, profil pribadi, role & access control, dan konfigurasi lainnya. Anda juga bisa memutar ulang tutorial ini kapan saja dari sini.",
  },
];

export function useOnboarding() {
  const queryClient = useQueryClient();
  const { can, isSuperAdmin, isLoading: permLoading, userId } = usePermissions();
  const slug = useCompanySlug();
  const [currentStep, setCurrentStep] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const { data: onboardingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["onboarding-status", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status", userId] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase
        .from("profiles")
        .update({ onboarding_completed: false } as any)
        .eq("id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-status", userId] });
    },
  });

  const availableSteps = useMemo(() => {
    if (permLoading) return [];
    return ALL_TOUR_STEPS.filter((step) => {
      if (isSuperAdmin) return true;
      return can(step.featureKey, "can_view");
    });
  }, [permLoading, isSuperAdmin, can]);

  const needsOnboarding = !statusLoading && !permLoading && onboardingStatus && !(onboardingStatus as any).onboarding_completed;

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setCurrentStep(0);
    setTourActive(true);
  }, []);

  const skipTour = useCallback(() => {
    setShowWelcome(false);
    setTourActive(false);
    completeMutation.mutate();
  }, [completeMutation]);

  const nextStep = useCallback(() => {
    if (currentStep < availableSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setTourActive(false);
      completeMutation.mutate();
    }
  }, [currentStep, availableSteps.length, completeMutation]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const finishTour = useCallback(() => {
    setTourActive(false);
    completeMutation.mutate();
  }, [completeMutation]);

  const replayTour = useCallback(() => {
    resetMutation.mutate();
    setCurrentStep(0);
    setShowWelcome(true);
  }, [resetMutation]);

  // Trigger welcome on first load
  const triggerWelcome = useCallback(() => {
    if (needsOnboarding) setShowWelcome(true);
  }, [needsOnboarding]);

  return {
    showWelcome,
    tourActive,
    currentStep,
    availableSteps,
    needsOnboarding,
    isLoading: statusLoading || permLoading,
    startTour,
    skipTour,
    nextStep,
    prevStep,
    finishTour,
    replayTour,
    triggerWelcome,
    setShowWelcome,
    slug,
  };
}
