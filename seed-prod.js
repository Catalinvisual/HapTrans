const data = {
  about: `
    <h2 style="color: #0f172a; font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem;">Cine suntem noi?</h2>
    <p style="color: #334155; font-size: 1.1rem; line-height: 1.8; margin-bottom: 1.5rem;">
      <strong>HapCargo</strong> s-a născut din pasiunea pentru un transport de marfă bine făcut, la timp și în deplină siguranță. Suntem o echipă tânără, extrem de ambițioasă, cu o abordare proaspătă a industriei logistice europene.
    </p>
    <p style="color: #334155; font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem;">
      Scopul nostru nu este doar să mutăm marfă din punctul A în punctul B, ci să fim acel partener de încredere la care poți apela cu ochii închiși. Indiferent dacă ai un palet sau un camion complet, noi ne asigurăm că ajunge impecabil la destinație.
    </p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; margin-top: 2rem;">
      <h3 style="color: #FF5A00; font-size: 1.4rem; font-weight: 700; margin-bottom: 1rem;">Misiunea Noastră</h3>
      <ul style="list-style-type: disc; margin-left: 1.5rem; color: #475569; font-size: 1.05rem; line-height: 1.6;">
        <li style="margin-bottom: 0.5rem;">Să oferim transparență 100% în fiecare stadiu al transportului.</li>
        <li style="margin-bottom: 0.5rem;">Să construim o flotă modernă, prietenoasă cu mediul.</li>
        <li style="margin-bottom: 0.5rem;">Să dezvoltăm relații bazate pe încredere cu clienții și șoferii noștri.</li>
      </ul>
    </div>
  `,
  services: `
    <h2 style="color: #0f172a; font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem;">Soluții Complete de Logistică</h2>
    <p style="color: #334155; font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem;">
      La <strong>HapCargo</strong>, înțelegem că fiecare afacere este unică. De aceea, am dezvoltat un portofoliu de servicii flexibile, gata să răspundă celor mai exigente cerințe de transport din Europa.
    </p>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-top: 2rem;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <h3 style="color: #0f172a; font-weight: 700; font-size: 1.25rem; margin-bottom: 0.75rem;">🚚 Transport FTL (Full Truck Load)</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Ideal pentru cantități mari. Aveți la dispoziție un camion întreg dedicat exclusiv mărfii dumneavoastră, asigurând cel mai scurt timp de tranzit.</p>
      </div>
      
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <h3 style="color: #0f172a; font-weight: 700; font-size: 1.25rem; margin-bottom: 0.75rem;">📦 Transport LTL (Grupaj)</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Soluția economică pentru expediții mai mici. Plătiți doar spațiul ocupat de marfa dumneavoastră pe camion.</p>
      </div>

      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <h3 style="color: #0f172a; font-weight: 700; font-size: 1.25rem; margin-bottom: 0.75rem;">⚡ Transport Express</h3>
        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5;">Când timpul este critic, folosim dube echipaj cu 2 șoferi pentru a livra marfa oriunde în Europa în regim de maximă urgență.</p>
      </div>
    </div>
  `,
  fleet: `
    <h2 style="color: #0f172a; font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem;">Flota Noastră Modernă</h2>
    <p style="color: #334155; font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem;">
      Suntem mândri de flota noastră echipată la cele mai înalte standarde europene. Investim constant în utilaje noi pentru a asigura nu doar fiabilitatea transportului, ci și confortul colegilor noștri șoferi și reducerea impactului asupra mediului.
    </p>

    <div style="background: #f8fafc; border-left: 4px solid #FF5A00; padding: 1.5rem; border-radius: 0 1rem 1rem 0; margin-bottom: 2.5rem;">
      <h3 style="color: #0f172a; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Echipamente de ultimă generație</h3>
      <p style="color: #475569; font-size: 1rem;">Toate camioanele noastre sunt EURO 6, dotate cu sisteme GPS avansate, senzori de securitate și asigurare CMR premium pentru marfa ta.</p>
    </div>

    <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 1.5rem;">Configurații Disponibile:</h3>
    
    <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem;">
      <li style="display: flex; align-items: center; gap: 1rem; background: white; padding: 1rem 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.75rem;">
        <span style="font-size: 1.5rem;">🚛</span>
        <div>
          <strong style="color: #0f172a; display: block; font-size: 1.1rem;">Mega Trailers (100mc)</strong>
          <span style="color: #64748b; font-size: 0.9rem;">Ideale pentru mărfuri voluminoase și industria automotive.</span>
        </div>
      </li>
      <li style="display: flex; align-items: center; gap: 1rem; background: white; padding: 1rem 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.75rem;">
        <span style="font-size: 1.5rem;">🚚</span>
        <div>
          <strong style="color: #0f172a; display: block; font-size: 1.1rem;">Semiremorci Standard (Tautliner)</strong>
          <span style="color: #64748b; font-size: 0.9rem;">Perfecte pentru paleți generali.</span>
        </div>
      </li>
      <li style="display: flex; align-items: center; gap: 1rem; background: white; padding: 1rem 1.5rem; border: 1px solid #e2e8f0; border-radius: 0.75rem;">
        <span style="font-size: 1.5rem;">🚐</span>
        <div>
          <strong style="color: #0f172a; display: block; font-size: 1.1rem;">Dube Express 3.5t</strong>
          <span style="color: #64748b; font-size: 0.9rem;">Pentru transporturi urgente, door-to-door, fără escale.</span>
        </div>
      </li>
    </ul>
  `,
  contact: `
    <div style="margin-bottom: 2rem;">
      <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Date de Identificare</h3>
      <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.2rem;"><strong>SC HAPCARGO SRL</strong></p>
      <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.2rem;">Cod Unic de Înregistrare: RO12345678</p>
      <p style="color: #475569; font-size: 1.05rem;">Nr. Reg. Comerțului: J40/1234/2026</p>
    </div>

    <div style="margin-bottom: 2rem;">
      <h3 style="color: #0f172a; font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem;">Sediul Central</h3>
      <p style="color: #475569; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem;">
        📍 București, România<br/>
        Strada Transportatorilor Nr. 10
      </p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 1rem;">
      <h3 style="color: #0f172a; font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Contact Direct</h3>
      <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem;">📞 <strong>Telefon:</strong> +40 700 000 000</p>
      <p style="color: #475569; font-size: 1.05rem; margin-bottom: 0.5rem;">📧 <strong>Email:</strong> office@hapcargo.ro</p>
      <p style="color: #475569; font-size: 1.05rem;">🕒 <strong>Program:</strong> Luni - Vineri: 08:00 - 18:00</p>
    </div>
  `
};

async function run() {
  try {
    const res = await fetch('https://joyful-exploration-production.up.railway.app/api/website-cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error(err);
  }
}
run();
