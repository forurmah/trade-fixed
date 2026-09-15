import { useState } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Header } from './components/Header';
import { MyDecisionsList } from './components/MyDecisionsList';
import { AddDecisionForm } from './components/AddDecisionForm';
import { EditDecisionForm } from './components/EditDecisionForm';
import { DecisionDetails } from './components/DecisionDetails';
import { DemoNotice } from './components/DemoNotice';
import { AppView, CreateDecisionInput, UpdateDecisionInput } from './types';
import { useDecisions } from './useDecisions';

export default function App() {
  // Shared state: List of decisions loaded from & synchronized with Local Storage
  const { decisions, loadError, reloadDecisions, addDecision, updateDecision, deleteDecision } = useDecisions();
  
  // Navigation state: current active view
  const [currentView, setCurrentView] = useState<AppView>('list');
  
  // Selected decision ID for the detail view
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);

  // User feedback announcement banner
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // Handler: Open the Add Decision form
  const handleOpenAddDecision = () => {
    setConfirmationMessage(null);
    setCurrentView('add');
  };

  // Handler: Cancel adding a decision and return to the list
  const handleCancelAddDecision = () => {
    setCurrentView('list');
  };

  // Handler: Save a new decision record to persistent local storage
  const handleSaveDecision = (data: CreateDecisionInput) => {
    // Persist via useDecisions -> decisionStorage (writes JSON to localStorage)
    addDecision(data);

    // Transition back to My Decisions and set the announcement message
    setCurrentView('list');
    setConfirmationMessage('Decision saved to local storage.');
  };

  // Handler: Open a decision's detail view
  const handleViewDecision = (id: string) => {
    setConfirmationMessage(null);
    setSelectedDecisionId(id);
    setCurrentView('detail');
  };

  // Handler: Open edit view for a decision
  const handleOpenEditDecision = (id: string) => {
    setConfirmationMessage(null);
    setSelectedDecisionId(id);
    setCurrentView('edit');
  };

  // Handler: Cancel editing a decision
  const handleCancelEditDecision = () => {
    if (selectedDecisionId) {
      setCurrentView('detail');
    } else {
      setCurrentView('list');
    }
  };

  /**
   * Handler: Save an edited decision record to persistent local storage.
   * CENTRAL REQUIREMENTS:
   * 1. Update the existing record by ID.
   * 2. Preserve its creation date.
   * 3. Update the screen only after saving succeeds.
   */
  const handleSaveEditedDecision = (data: UpdateDecisionInput) => {
    if (!selectedDecisionId) return;

    // Persist via updateDecision first; if saving fails, it throws before any screen updates
    updateDecision(selectedDecisionId, data);

    // Screen updates ONLY AFTER saving succeeds!
    setCurrentView('detail');
    setConfirmationMessage('Decision updated successfully.');
  };

  /**
   * Handler: Delete a single decision by ID.
   * REQUIREMENTS:
   * 1. Persist the deletion before updating React state or navigating.
   * 2. If saving fails, updateDecision/deleteDecision throws so details screen shows error and stays.
   * 3. After success, return to list, clear selected ID, and show "Decision deleted."
   */
  const handleDeleteDecision = (id: string) => {
    // Persist via deleteDecision -> deleteAndStoreDecision
    // If saving fails or loading reports corruption, this throws and prevents navigation
    deleteDecision(id);

    // After success: return to list, clear selected ID, and set confirmation message
    setSelectedDecisionId(null);
    setCurrentView('list');
    setConfirmationMessage('Decision deleted.');
  };

  // Handler: Return to the My Decisions list
  const handleBackToList = () => {
    setConfirmationMessage(null);
    setCurrentView('list');
    setSelectedDecisionId(null);
  };

  // Find the selected decision for the detail view
  const selectedDecision = decisions.find((d) => d.id === selectedDecisionId);

  return (
    <div className="min-h-screen bg-[#FCF8F7] text-[#18233F] flex flex-col font-sans selection:bg-[#F2DFDF] selection:text-[#18233F]">
      {/* Slim Header with branding and view switcher */}
      <Header
        onNavClick={handleBackToList}
        currentView={currentView}
      />

      {/* Main Content Area (constrained to ~760px wide) */}
      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16 min-w-0">
        {/* Persistent loadError banner when user is on add or detail view */}
        {currentView !== 'list' && loadError && (
          <div
            role="alert"
            data-testid="loading-error-message"
            className="mb-6 bg-[#FDF2F4] border border-[#F1D3D7] text-[#85273C] px-4 py-3 rounded-xl flex items-center justify-between text-[14px] font-medium min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#9E2D46]" aria-hidden="true" />
              <span className="break-words [overflow-wrap:anywhere]">{loadError}</span>
            </div>
            <button
              type="button"
              id="retry-app-banner-button"
              data-testid="retry-button"
              onClick={reloadDecisions}
              className="ml-3 shrink-0 inline-flex items-center gap-1.5 bg-[#9E2D46] hover:bg-[#7A1E33] text-white text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46]"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* VIEW 1: My Decisions List */}
        {currentView === 'list' && (
          <MyDecisionsList
            decisions={decisions}
            loadError={loadError}
            onRetryLoad={reloadDecisions}
            onOpenAddDecision={handleOpenAddDecision}
            onViewDecision={handleViewDecision}
            confirmationMessage={confirmationMessage}
            onDismissConfirmation={() => setConfirmationMessage(null)}
          />
        )}

        {/* VIEW 2: Add Decision Form */}
        {currentView === 'add' && (
          <div className="space-y-6 min-w-0">
            {/* Top Back Link */}
            <div>
              <button
                type="button"
                id="back-to-decisions-link"
                onClick={handleCancelAddDecision}
                className="text-[13.5px] sm:text-[14px] text-[#9E2D46] hover:text-[#7A1E33] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46] rounded py-1 -ml-1 px-1"
              >
                <span aria-hidden="true">←</span>
                <span>My Decisions</span>
              </button>
            </div>

            {/* Page Headings */}
            <div className="text-center sm:text-left space-y-1.5 min-w-0">
              <h1
                id="add-decision-heading"
                className="font-serif-heading text-[28px] sm:text-[36px] text-[#18233F] font-semibold tracking-tight leading-tight break-words [overflow-wrap:anywhere]"
              >
                A new decision
              </h1>
              <p className="text-[15px] sm:text-[16px] text-[#5C667E]">
                Give your choice a little clarity.
              </p>
            </div>

            {/* Reused Add Decision Form */}
            <section aria-labelledby="add-decision-heading" className="min-w-0">
              <AddDecisionForm
                onSave={handleSaveDecision}
                onCancel={handleCancelAddDecision}
              />
            </section>

            {/* Demo Notice */}
            <DemoNotice />

            {/* Calming note */}
            <p className="text-center text-[13px] sm:text-[14px] text-[#4F596F] font-medium pt-2 select-none">
              You can come back later to reflect on what happened.
            </p>
          </div>
        )}

        {/* VIEW 3: Decision Details */}
        {currentView === 'detail' && (
          <DecisionDetails
            decision={selectedDecision}
            onBack={handleBackToList}
            onEdit={handleOpenEditDecision}
            onDelete={handleDeleteDecision}
            confirmationMessage={confirmationMessage}
            onDismissConfirmation={() => setConfirmationMessage(null)}
          />
        )}

        {/* VIEW 4: Edit Decision Form */}
        {currentView === 'edit' && selectedDecision && (
          <div className="space-y-6 min-w-0">
            {/* Top Back Link */}
            <div>
              <button
                type="button"
                id="back-to-details-link"
                onClick={handleCancelEditDecision}
                className="text-[13.5px] sm:text-[14px] text-[#9E2D46] hover:text-[#7A1E33] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9E2D46] rounded py-1 -ml-1 px-1"
              >
                <span aria-hidden="true">←</span>
                <span>Back to decision</span>
              </button>
            </div>

            {/* Page Headings */}
            <div className="text-center sm:text-left space-y-1.5 min-w-0">
              <h1
                id="edit-decision-heading"
                className="font-serif-heading text-[28px] sm:text-[36px] text-[#18233F] font-semibold tracking-tight leading-tight break-words [overflow-wrap:anywhere]"
              >
                Edit decision
              </h1>
              <p className="text-[15px] sm:text-[16px] text-[#5C667E]">
                Revise your decision while keeping your original timeline intact.
              </p>
            </div>

            {/* Edit Decision Form */}
            <section aria-labelledby="edit-decision-heading" className="min-w-0">
              <EditDecisionForm
                decision={selectedDecision}
                onSave={handleSaveEditedDecision}
                onCancel={handleCancelEditDecision}
              />
            </section>

            {/* Demo Notice */}
            <DemoNotice />
          </div>
        )}
      </main>
    </div>
  );
}
