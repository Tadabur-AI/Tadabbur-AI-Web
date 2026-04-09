import { useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { reportWrongTafsir } from '../../services/tafsirExplainerService';
import { ActionButton, IconButton, TextAreaField } from '../ui/primitives';
import Overlay from '../ui/Overlay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tafsirText: string | null;
  verse: string;
  tafsirAuthor: string;
  originalExplanation: string;
}

export default function ReportWrongModal({
  isOpen,
  onClose,
  tafsirText,
  verse,
  tafsirAuthor,
  originalExplanation,
}: Props) {
  const [complaint, setComplaint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim() || !tafsirText) return;

    setIsSubmitting(true);
    setError('');
    
    try {
      const result = await reportWrongTafsir(
        tafsirText,
        verse,
        tafsirAuthor,
        originalExplanation,
        complaint
      );
      
      if (result.success) {
        setSuccess(
          result.isCorrected 
            ? 'Thank you. The AI processed your report and corrected the explanation. Refresh if you do not see the update yet.' 
            : 'Thank you! We have flagged this for manual review.'
        );
        setTimeout(() => {
          onClose();
          setSuccess('');
          setComplaint('');
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Overlay
      open={isOpen}
      onClose={isSubmitting ? () => undefined : onClose}
      labelledBy="report-wrong-modal-title"
      describedBy="report-wrong-modal-description"
      surfaceClassName="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-xl"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-2 text-danger">
            <FiAlertTriangle size={20} aria-hidden="true" />
            <h2 id="report-wrong-modal-title" className="text-lg font-semibold">Report an AI Issue</h2>
          </div>
          <IconButton
            label="Close report dialog"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <FiX size={20} />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <p id="report-wrong-modal-description" className="sr-only">
            Describe the problem in the AI explanation so it can be reviewed or corrected.
          </p>
          {success ? (
            <div className="rounded-lg bg-success/10 p-4 text-success" aria-live="polite">
              <p className="text-sm">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
              <p className="text-sm text-text-muted">
                If the AI hallucinated, misstated the tafsir, or mistranslated the source, describe the problem clearly below.
              </p>
              
              <div className="flex-1">
                <TextAreaField
                  label="What is wrong?"
                  className="h-32"
                  placeholder="For example, the AI incorrectly stated that…"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {error && (
                <div className="text-danger text-sm bg-danger/10 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-auto">
                <ActionButton
                  variant="ghost"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="danger"
                  disabled={isSubmitting || !complaint.trim()}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce"></div>
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </ActionButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </Overlay>
  );
}
