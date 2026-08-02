import { create } from 'zustand';

export type PresentationAnimation = 'graffiti' | 'rocketship' | 'jumping-avatars';

interface UIStore {
    isSidebarCollapsed: boolean;
    presentationAnimation: PresentationAnimation;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setPresentationAnimation: (animation: PresentationAnimation) => void;
    toggleSidebar: () => void;
}

const PRESENTATION_ANIMATION_KEY = 'team_assemble_presentation_animation';

export const useUIStore = create<UIStore>((set) => ({
    isSidebarCollapsed: false,
    presentationAnimation: (localStorage.getItem(PRESENTATION_ANIMATION_KEY) as PresentationAnimation) || 'graffiti',
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    setPresentationAnimation: (animation) => {
        localStorage.setItem(PRESENTATION_ANIMATION_KEY, animation);
        set({ presentationAnimation: animation });
    },
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
