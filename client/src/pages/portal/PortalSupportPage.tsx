import { HelpCircle, Mail, Phone, MessageSquare } from 'lucide-react';

export default function PortalSupportPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Support & Contact</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-card border border-border rounded-2xl shadow-sm p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold mb-2">Call Us</h3>
          <p className="text-sm text-text-secondary">+40 700 000 000</p>
          <p className="text-xs text-text-secondary mt-1">Mon-Fri, 08:00 - 18:00</p>
        </div>
        
        <div className="card bg-card border border-border rounded-2xl shadow-sm p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold mb-2">Email Us</h3>
          <p className="text-sm text-text-secondary">support@haptrans.com</p>
          <p className="text-xs text-text-secondary mt-1">24/7 Response within 2 hours</p>
        </div>

        <div className="card bg-card border border-border rounded-2xl shadow-sm p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold mb-2">Live Chat</h3>
          <p className="text-sm text-text-secondary">Chat with our dispatchers</p>
          <p className="text-xs text-text-secondary mt-1">Available Now</p>
        </div>
      </div>

      <div className="card bg-card border border-border rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5"/> Send a Message</h3>
        <form className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input className="input" placeholder="E.g., Issue with Order #1024" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input min-h-[150px]" placeholder="How can we help you?"></textarea>
          </div>
          <button type="button" className="btn-primary py-2 px-6">Send Message</button>
        </form>
      </div>
    </div>
  );
}
