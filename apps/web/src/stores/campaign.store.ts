'use client';

import { create } from 'zustand';
import type { CampaignSummary, Campaign, CampaignProgress } from '@email-platform/shared';

interface CampaignStore {
  campaigns: CampaignSummary[];
  currentCampaign: Campaign | null;
  progress: CampaignProgress | null;
  isLoading: boolean;
  error: string | null;

  setCampaigns: (campaigns: CampaignSummary[]) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  setProgress: (progress: CampaignProgress | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateCampaignStatus: (id: string, status: string) => void;
  removeCampaign: (id: string) => void;
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  campaigns: [],
  currentCampaign: null,
  progress: null,
  isLoading: false,
  error: null,

  setCampaigns: (campaigns) => set({ campaigns }),
  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),
  setProgress: (progress) => set({ progress }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  updateCampaignStatus: (id, status) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, status: status as CampaignSummary['status'] } : c,
      ),
    })),
  removeCampaign: (id) =>
    set((state) => ({
      campaigns: state.campaigns.filter((c) => c.id !== id),
    })),
}));
