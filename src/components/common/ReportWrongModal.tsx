import { useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { reportWrongTafsir } from '../../services/tafsirExplainerService';

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
            ? 'Thank you! The AI has processed your report and corrected the explanation. You may need to refresh to see the changes.' 
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 flex-shrink-0 border-b border-border">
          <div className="flex items-center gap-2 text-danger">
            <FiAlertTriangle size={20} />
            <h2 className="text-lg font-semibold">Report Issue with AI Explanation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {success ? (
            <div className="bg-success/10 text-success p-4 rounded-lg flex items-start gap-3">
              <p className="text-sm">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
              <p className="text-sm text-text-muted">
                Has the AI hallucinated, produced incorrect information, or mistranslated the original tafseer? Please describe the issue below so we can fix it.
              </p>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-text mb-2">
                  What's wrong?
                </label>
                <textarea
                  className="w-full h-32 p-3 bg-surface-2 border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow"
                  placeholder="e.g. The AI incorrectly stated that..."
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
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-medium text-text-muted hover:text-text hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !complaint.trim()}
                  className="px-6 py-2 bg-danger hover:bg-danger/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
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
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
