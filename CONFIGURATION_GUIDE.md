# MakeMyTrip / MakeMyTour - Configuration & Setup Guide

This guide details all environment configurations, port settings, database options, email/passcode credentials, and API endpoints required to run the application with **Task 1: Live Flight Status System**.

---

## 1. Backend Server Port Configuration

The backend Spring Boot server port is set to **`8081`**.

- **File location:** [`src/main/resources/application.properties`](file:///c:/Users/manis/VS%20Code-work%20space/make-my-trip-clone-springboot/src/main/resources/application.properties)
- **Setting:**
  ```properties
  server.port=8081
  ```

---

## 2. Database Configuration (MongoDB)

Your MongoDB URI is configured inside [`src/main/resources/application.properties`](file:///c:/Users/manis/VS%20Code-work%20space/make-my-trip-clone-springboot/src/main/resources/application.properties):

```properties
spring.data.mongodb.uri=mongodb://localhost:27017/InternshipMakemytrip
spring.data.mongodb.database=makemytrip
```

---

## 3. Email & Push Notification Passcode Configuration (SMTP)

The system supports **real SMTP email notifications** when configured, as well as an automatic **test simulation mode** (which logs formatted test email notifications to backend console/logs when SMTP credentials are commented out or not yet set).

To enable real email sending via Gmail SMTP, uncomment and fill in your email credentials in `application.properties`:

```properties
# Spring Boot Mail / SMTP Configuration
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-official-email@gmail.com
spring.mail.password=your-16-digit-app-passcode

# SMTP Security Properties
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
```

> **Note on Test Mode:** When `spring.mail.host` is commented out, clicking **"Mail"** or **"Send Email"** on the Live Flight Status UI automatically triggers test mode, rendering simulated emails directly to the Spring Boot console output without throwing errors.

> **Note on App Passcode:** For Gmail accounts, generate a 16-character **App Password** from Google Account Security settings (`Security` -> `2-Step Verification` -> `App passwords`).


---

## 4. Frontend Environment Configuration (Next.js)

Create a `.env.local` file inside the [`makemytour`](file:///c:/Users/manis/VS%20Code-work%20space/make-my-trip-clone-springboot/makemytour) directory:

```env
# makemytour/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

If `.env.local` is not specified, the application defaults automatically to `http://localhost:8081`.

---

## 5. Task 1: Live Flight Status & Multi-Flight Radar Feature

### REST API Endpoints (Backend - Port 8081)

| Method | Endpoint | Description |
|---|---|---|
| **GET** | `/api/flight-status` | Search and filter all active flights (Params: `query`, `status`) |
| **GET** | `/api/flight-status/{flightNumber}` | Get status details for a specific flight (e.g. `AI-101`) |
| **POST** | `/api/flight-status/tracked` | Fetch batch status updates for multiple tracked flight numbers |
| **POST** | `/api/flight-status/simulate` | Trigger real-time status change or schedule delay simulation |
| **GET** | `/api/flight-status/simulate-random` | Trigger a quick random status/delay update event |

### Key Features Implemented:
1. **Mock API Real-Time Radar**: Simulates "Delayed by 1h", "On Time", "Boarding", "In Flight", "Landed".
2. **Push Notification Drawer & Toast Alerts**: Displays real-time alerts for delays, gate updates, and departure changes.
3. **Status Context & Reason for Delay**: Provides detailed explanations (e.g. "Adverse weather & dense fog", "Technical inspection") and revised departure/arrival schedules.
4. **Multi-Flight Simultaneous Tracking**: Pin multiple flights simultaneously to an active watchlist.
5. **Dynamic ETA Counter**: Live estimated arrival updates and flight progress bar.

---

## 6. How to Run Backend & Frontend

### Starting Backend (Spring Boot - Port 8081):
```bash
# In workspace root directory:
./mvnw spring-boot:run
```

### Starting Frontend (Next.js - Port 3000):
```bash
# In makemytour directory:
cd makemytour
npm run dev
```

Visit [http://localhost:3000/flight-status](http://localhost:3000/flight-status) or click **"Live Flight Tracker"** on the navigation bar to use the Live Flight Status system.
