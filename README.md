# ShuttleTracker 🚍

## Project Description
ShuttleTracker is a mobile bus tracking application designed for students and staff to monitor shuttle services between campuses (Bellville and D6). The app provides real-time updates on bus locations, arrival times, and route statuses, ensuring reliable transport information and improving campus mobility.

## Objectives
- Provide a **real-time bus tracking interface** with map visualization.
- Allow users to **filter routes** and view bus details (arrival times, next stops, passenger info).
- Deliver a **minimalist, user-friendly UI** optimized for small screens.
- Implement **business rules** for bus assignment, arrival time updates, and status indicators.

## Key Features
- **Login Screen**: Secure access with email and password.
- **Dashboard**: Map view showing buses (green = moving, orange = stopped).
- **Bus Cards**: Route name, bus number, next stop, arrival time, and status (🟢 On Time, 🟠 Delayed, 🔴 Early).
- **Filter Menu**: Dropdown to select Bellville or D6 routes.
- **Navigation Bar**: Quick access to Home, Routes, Saved, and Profile.

## Technical Components
- **ERD Diagram**: Entities include Bus, Route, Stop, Driver, and User.
- **Attributes/Data**: Each entity has defined attributes (e.g., bus_id, route_name, arrival_time).
- **User Interface**: Clean, modern design with consistent color palette (Dark Blue, Green, Orange).
- **Business Rules**: Each bus belongs to one route; arrival times refresh every 30 seconds; users restricted to their campus routes.

## Value Added
- Enhances transport reliability for students and staff.
- Reduces waiting time and uncertainty.
- Provides a scalable foundation for future features like GPS integration and notifications.
