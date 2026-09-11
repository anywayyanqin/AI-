import React, { useState } from 'react';
import { useWorkbenchStore } from './store/workbenchStore';
import { TopNav } from './components/TopNav';
import { CodexSidebar } from './components/CodexSidebar';
import { ChatPanel } from './components/ChatPanel';
import { WorkbenchHeader } from './components/WorkbenchHeader';
import { ChartArea } from './components/ChartArea';
import { ParamBar } from './components/ParamBar';
import { DetailsBottomTabs } from './components/DetailsBottomTabs';
import { CandidatePoolView } from './components/CandidatePoolView';
import { TargetPoolModal } from './components/TargetPoolModal';
import { PineExportModal } from './components/PineExportModal';
import { NewIndicatorModal } from './components/NewIndicatorModal';
import { BacktestConfigDrawer } from './components/BacktestConfigDrawer';
import { BsSignalsDrawer } from './components/BsSignalsDrawer';

export default function App() {
  const { state, store } = useWorkbenchStore();
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [newIndicatorModalOpen, setNewIndicatorModalOpen] = useState(false);
  const [exportTargetIndicatorId, setExportTargetIndicatorId] = useState<string | undefined>(undefined);

  const handleOpenExport = (indicatorId?: string) => {
    setExportTargetIndicatorId(indicatorId);
    setExportModalOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans select-none antialiased">
      {/* 1. Global 48px Top Navigation */}
      <TopNav
        onOpenTargetModal={() => setTargetModalOpen(true)}
        onOpenSettingsModal={() => store.setBacktestDrawerOpen(true)}
      />

      {/* 2. Main Body: Workbench or Candidate Pool */}
      {state.activeTab === 'workbench' ? (
        <main className="flex-1 flex overflow-hidden w-full relative">
          {/* Codex Sidebar: Sessions & Projects with hover-to-generate session */}
          <CodexSidebar />

          {/* Chat Panel: Conversational Tuning Panel */}
          <ChatPanel />

          {/* Right: Indicator Workbench */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
            {/* Top Indicator Tabs & Header Summary */}
            <WorkbenchHeader
              onExportPine={() => handleOpenExport()}
              onOpenNewIndicatorModal={() => setNewIndicatorModalOpen(true)}
            />

            {/* Synchronized Dual-Grid Candlestick & NAV Chart */}
            <ChartArea />

            {/* Collapsible Parameter & Backtest Bar */}
            <ParamBar />

            {/* 4-Tab Bottom Details: Trades, Yearly, Symbol, Code */}
            <DetailsBottomTabs />
          </div>
        </main>
      ) : (
        <CandidatePoolView onExportIndicator={id => handleOpenExport(id)} />
      )}

      {/* Modals */}
      <TargetPoolModal
        isOpen={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
      />

      <PineExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        indicatorId={exportTargetIndicatorId}
      />

      <NewIndicatorModal
        isOpen={newIndicatorModalOpen}
        onClose={() => setNewIndicatorModalOpen(false)}
      />

      {/* Independent Backtest Configuration Sidebar Drawer */}
      <BacktestConfigDrawer />

      {/* Full B/S Buy & Sell Signals and Trade Details Drawer */}
      <BsSignalsDrawer />
    </div>
  );
}
