# MiniBank API (Spring Boot)

MiniBank is a backend-only REST API that supports:
- Creating accounts (in-memory)
- Getting account balances
- Money transfers
- Idempotent transfer processing via `Idempotency-Key`
- Concurrency-safe transfers (per-account locking + lock ordering)
- Transfer audit trail + account transfer history

## Tech Stack
- Java + Spring Boot
- Maven
- JUnit 5
- In-memory storage (ConcurrentHashMap)
- Concurrency control (ReentrantLock)
- Bean Validation (`@Valid`)



## Run
## Linux/Mac
./mvnw spring-boot:run

### Windows PowerShell 
```powershell
.\mvnw spring-boot:run




