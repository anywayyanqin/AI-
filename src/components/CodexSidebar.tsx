import React, { useState, useRef, useEffect } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';
import {
  SquarePen,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

export const cleanSessionTitle = (title: string): string => {
  if (!title) return '';
  return title.replace(/^(?:第\s*\d+\s*个会话|会话\s*[0-9A-Za-z一二三四五六七八九十]+)\s*[·:：\-\—\s]\s*/, '').trim() || title;
};

export const CodexSidebar: React.FC = () => {
  const { state, store, activeIndicator } = useWorkbenchStore();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('codex_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // When collapsed, hovering over the left edge opens this floating panel
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    'ind-1': true,
    'ind-2': true,
    'ind-3': true,
  });

  // Hover menu state for project row
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Rename session state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Secondary delete confirmation modal state
  const [sessionToDelete, setSessionToDelete] = useState<{
    sessionId: string;
    indicatorId: string;
    title: string;
  } | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSessionToDelete(null);
      }
    };
    if (sessionToDelete) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [sessionToDelete]);

  // Close project menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuProjectId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Collapse and hide sidebar completely
  const handleCollapse = () => {
    setIsCollapsed(true);
    setIsHoverOpen(false);
    try {
      localStorage.setItem('codex_sidebar_collapsed', 'true');
    } catch {}
  };

  // Pin open sidebar permanently
  const handlePinOpen = () => {
    setIsCollapsed(false);
    setIsHoverOpen(false);
    try {
      localStorage.setItem('codex_sidebar_collapsed', 'false');
    } catch {}
  };

  // Trigger hover expansion
  const handleTriggerMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoverOpen(true);
  };

  const handlePanelMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handlePanelMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverOpen(false);
    }, 260);
  };

  const toggleProjectExpand = (indId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects(prev => ({ ...prev, [indId]: !prev[indId] }));
  };

  const handleCreateSessionForIndicator = (indId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    store.createSession(undefined, indId);
    setActiveMenuProjectId(null);
  };

  const handleStartRename = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setRenameValue(title);
  };

  const handleSaveRename = (sessionId: string, indId?: string) => {
    if (renameValue.trim()) {
      store.renameSession(sessionId, renameValue.trim(), indId);
    }
    setEditingSessionId(null);
  };

  // Collect all recent sessions across indicators
  const allRecentSessions = state.indicators.flatMap(ind => {
    const sessions = store.getSessions(ind.id);
    return sessions.map(s => ({
      ...s,
      indicatorId: ind.id,
      indicatorName: ind.name,
    }));
  });

  // Reusable Session List & Project Explorer Body
  const renderSidebarBody = (isFloatingMode: boolean) => (
    <>
      {/* 1. Header: Clean and minimal without repetitive branding */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-700 px-0.5">
          会话
        </span>

        <div className="flex items-center space-x-1">
          {isFloatingMode ? (
            <>
              <button
                onClick={handlePinOpen}
                className="p-1 text-slate-400 hover:text-[#2F6FED] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                title="固定显示在左侧"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsHoverOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                title="折叠隐藏"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={handleCollapse}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title="点击折叠并直接隐藏（鼠标移至最左侧可唤出）"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top "新建探讨会话" Button */}
      <div className="px-2.5 py-2 shrink-0">
        <button
          onClick={() => store.createSession()}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 transition-colors cursor-pointer group font-medium text-xs shadow-2xs"
        >
          <div className="flex items-center space-x-2">
            <SquarePen className="w-4 h-4 text-slate-600 group-hover:text-[#2F6FED] transition-colors" />
            <span className="font-semibold text-slate-800 group-hover:text-[#2F6FED]">新建探讨会话</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono group-hover:text-[#2F6FED] bg-slate-100 group-hover:bg-blue-100 px-1 py-0.5 rounded">⌥N</span>
        </button>
      </div>

      {/* Scrollable middle list: 置顶 / 项目 / 最近 */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-3 text-xs pr-1">
        {/* Section: 置顶 */}
        <div>
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400">置顶</div>
          <div
            onClick={() => store.setActiveIndicator('ind-1')}
            className="px-2.5 py-1.5 rounded-lg text-slate-800 hover:bg-slate-200/50 cursor-pointer truncate font-medium text-[12px] transition-colors"
          >
            合并交易记录表头
          </div>
        </div>

        {/* Section: 项目 (Projects / Indicators) */}
        <div>
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400">
            <span>项目</span>
          </div>

          <div className="space-y-1 mt-0.5">
            {state.indicators.map((ind) => {
              const isActive = ind.id === activeIndicator?.id;
              const isExpanded = expandedProjects[ind.id] ?? true;
              const sessions = store.getSessions(ind.id);
              const activeSess = store.getActiveSession(ind.id);
              const isHovered = hoveredProjectId === ind.id;
              const isMenuOpen = activeMenuProjectId === ind.id;

              return (
                <div
                  key={ind.id}
                  onMouseEnter={() => setHoveredProjectId(ind.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                  className="rounded-lg transition-colors group relative"
                >
                  {/* Indicator / Project Row */}
                  <div
                    onClick={() => store.setActiveIndicator(ind.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-200/70 text-slate-900 font-semibold shadow-2xs'
                        : 'hover:bg-slate-200/40 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => toggleProjectExpand(ind.id, e)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>

                      <Folder className="w-3.5 h-3.5 text-slate-600 shrink-0" />

                      <span className="truncate text-xs text-slate-800 font-medium flex-1">
                        {ind.name}
                      </span>
                    </div>

                    {/* Hover Action: 移入出现【生成对应会话】快捷入口与菜单 */}
                    <div
                      className={`flex items-center space-x-0.5 shrink-0 ml-1 transition-opacity ${
                        isHovered || isMenuOpen ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {/* Direct "+ 生成对应会话" button */}
                      <button
                        type="button"
                        onClick={(e) => handleCreateSessionForIndicator(ind.id, e)}
                        className="p-1 rounded bg-blue-50 text-[#2F6FED] hover:bg-blue-100 hover:text-[#2557CA] transition-colors cursor-pointer shadow-2xs"
                        title="移入点击：为此指标生成对应会话"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown More Menu trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuProjectId(isMenuOpen ? null : ind.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-300/60 transition-colors cursor-pointer"
                        title="更多操作"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Project Hover Popover Menu */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs select-none"
                    >
                      <div className="px-2 py-1 text-[10px] font-semibold text-slate-400">
                        指标操作 · {ind.name}
                      </div>
                      <button
                        onClick={(e) => handleCreateSessionForIndicator(ind.id, e)}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-800 hover:bg-blue-50 hover:text-[#2F6FED] font-medium transition-colors text-left cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#2F6FED]" />
                        <span>生成对应探讨会话</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          store.setActiveIndicator(ind.id);
                          setActiveMenuProjectId(null);
                        }}
                        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                        <span>切换至工作台视图</span>
                      </button>
                    </div>
                  )}

                  {/* Sessions under this project when expanded */}
                  {isExpanded && sessions.length > 0 && (
                    <div className="ml-5 pl-2 border-l border-slate-200/80 my-1 space-y-0.5">
                      {sessions.map((sess) => {
                        const isCurrentActive =
                          isActive && sess.id === store.getActiveSessionId(ind.id);
                        const isEditing = editingSessionId === sess.id;

                        if (isEditing) {
                          return (
                            <div key={sess.id} className="py-1 pr-1 flex items-center space-x-1">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(sess.id, ind.id);
                                  if (e.key === 'Escape') setEditingSessionId(null);
                                }}
                                autoFocus
                                className="w-full px-1.5 py-0.5 text-xs bg-white border border-blue-300 rounded outline-none"
                              />
                              <button
                                onClick={() => handleSaveRename(sess.id, ind.id)}
                                className="p-0.5 text-[#2F6FED] hover:bg-blue-50 rounded"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingSessionId(null)}
                                className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={sess.id}
                            onClick={() => store.switchSession(sess.id, ind.id)}
                            className={`group/sess flex items-center justify-between px-2 py-1 rounded-md text-[11px] cursor-pointer transition-all ${
                              isCurrentActive
                                ? 'bg-blue-50/90 text-[#2F6FED] font-medium'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                            }`}
                          >
                            <span className="truncate flex-1">{cleanSessionTitle(sess.title)}</span>
                            <div className="flex items-center space-x-0.5 opacity-0 group-hover/sess:opacity-100 shrink-0 ml-1">
                              <button
                                onClick={(e) => handleStartRename(sess.id, sess.title, e)}
                                className="p-0.5 text-slate-400 hover:text-[#2F6FED] rounded"
                                title="重命名会话"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              {sessions.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToDelete({
                                      sessionId: sess.id,
                                      indicatorId: ind.id,
                                      title: cleanSessionTitle(sess.title),
                                    });
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-red-500 rounded cursor-pointer transition-colors"
                                  title="删除会话"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: 最近 (Recent) */}
        <div>
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400">最近</div>
          <div className="space-y-0.5 mt-0.5">
            {allRecentSessions.slice(0, 6).map((sess) => {
              const isCurrentActive =
                sess.indicatorId === activeIndicator?.id &&
                sess.id === store.getActiveSessionId(sess.indicatorId);
              const sessionsCount = store.getSessions(sess.indicatorId).length;

              return (
                <div
                  key={sess.id}
                  onClick={() => store.switchSession(sess.id, sess.indicatorId)}
                  className={`group/rec flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors font-medium ${
                    isCurrentActive
                      ? 'bg-slate-200/80 text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/40'
                  }`}
                  title={`${sess.indicatorName} · ${cleanSessionTitle(sess.title)}`}
                >
                  <span className="truncate flex-1">{cleanSessionTitle(sess.title)}</span>
                  {sessionsCount > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete({
                          sessionId: sess.id,
                          indicatorId: sess.indicatorId,
                          title: cleanSessionTitle(sess.title),
                        });
                      }}
                      className="opacity-0 group-hover/rec:opacity-100 p-0.5 text-slate-400 hover:text-red-500 rounded ml-1 shrink-0 cursor-pointer transition-colors"
                      title="删除会话"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  // Secondary confirmation modal JSX (rendered in both collapsed and pinned modes)
  const renderConfirmModal = () => {
    if (!sessionToDelete) return null;

    return (
      <div
        className="fixed inset-0 z-100 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
        onClick={() => setSessionToDelete(null)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-4.5 space-y-3.5 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900">
                确认删除会话？
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                您确定要删除会话「<span className="font-semibold text-slate-800">{sessionToDelete.title}</span>」吗？
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSessionToDelete(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                store.deleteSession(sessionToDelete.sessionId, sessionToDelete.indicatorId);
                setSessionToDelete(null);
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>确认删除</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // When Collapsed: render an edge trigger, and when mouse hovers over it, slide out the floating session list
  if (isCollapsed) {
    return (
      <>
        {/* Left edge trigger strip: directly on the far left */}
        <div
          onMouseEnter={handleTriggerMouseEnter}
          onClick={handlePinOpen}
          className="w-2.5 hover:w-3.5 h-full bg-slate-100/80 hover:bg-blue-100/80 border-r border-slate-200 flex flex-col items-center justify-center cursor-pointer transition-all shrink-0 z-30 group"
          title="鼠标移入展开会话列表（点击直接固定）"
        >
          <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-[#2F6FED] transition-colors" />
        </div>

        {/* Floating Flyout Panel shown on hover */}
        {isHoverOpen && (
          <aside
            onMouseEnter={handlePanelMouseEnter}
            onMouseLeave={handlePanelMouseLeave}
            className="w-64 h-full bg-[#FAFBFD] border-r border-[#E5E8EE] shadow-2xl z-50 flex flex-col select-none text-slate-700 font-sans absolute left-0 top-0 bottom-0 animate-in slide-in-from-left duration-150"
          >
            {renderSidebarBody(true)}
          </aside>
        )}

        {renderConfirmModal()}
      </>
    );
  }

  // Normal In-Flow Pinned Sidebar
  return (
    <>
      <aside className="w-60 h-full bg-[#FAFBFD] border-r border-[#E5E8EE] flex flex-col select-none shrink-0 z-20 text-slate-700 font-sans">
        {renderSidebarBody(false)}
      </aside>
      {renderConfirmModal()}
    </>
  );
};
