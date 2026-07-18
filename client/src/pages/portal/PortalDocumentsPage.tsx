import { FileText } from 'lucide-react';

export default function PortalDocumentsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Documents</h1>
      <div className="card bg-card border border-border rounded-2xl shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-text-secondary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Centralized Document Storage</h2>
        <p className="text-text-secondary max-w-md mx-auto">
          View all your CMRs, Proof of Deliveries, and Transport Contracts in one place.
          This feature will be available shortly.
        </p>
      </div>
    </div>
  );
}
