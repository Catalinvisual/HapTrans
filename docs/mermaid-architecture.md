# HAP CARGO TMS — Architecture Diagram (Mermaid)

```mermaid
flowchart TB
  subgraph Clients
    WebTMS[Web TMS - Next.js]
    DriverApp[Driver App - Expo/React Native]
    CustomerPortal[Customer Portal - Next.js]
    CarrierPortal[Carrier Portal - Next.js]
    IntegrationClients[External Integrations / Automation / AI]
  end

  APIConsumerShared[Shared api-client + Zod DTOs + i18next resources]

  subgraph API[NestJS - Modular Monolith]
    CrossCutting[Auth | AuthZ CASL | Validation | Swagger | Unified Errors | Rate Limit]
    subgraph Modules[Business Modules]
      IdentityOrg[Identity / Organization]
      MasterData[Master Data / Customers / Commercial]
      Operations[Orders / Planning / Trips / Dispatch]
      Fleet[Drivers / Vehicles / Trailers / Fleet]
      Finance[Finance / Invoicing / Payments]
      Documents[Documents / CMR / POD]
      Reporting[Analytics / Reporting / KPIs]
    end
    Services[AuditService | EventBus | PdfService | ExportService | FileStorage | NotificationService]
  end

  subgraph Infra
    PG[(PostgreSQL - Prisma)]
    Redis[(Redis - cache / queue / rate-limit)]
    ObjectStore[(Object Store - S3/MinIO)]
    Queue[BullMQ Queue + Workers]
    Messaging[Email / SMS / Push]
  end

  WebTMS & DriverApp & CustomerPortal & CarrierPortal & IntegrationClients --> APIConsumerShared
  APIConsumerShared --> API
  API --> PG
  API --> Redis
  API --> ObjectStore
  API --> Queue
  API --> Messaging
  Queue --> Services
```
