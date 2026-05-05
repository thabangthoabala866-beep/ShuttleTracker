from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timedelta
import random

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    full_name = db.Column(db.String(100))
    campus = db.Column(db.String(50))  # Primary campus
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class Campus(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    code = db.Column(db.String(10), unique=True)  # BELL, D6, GRAN, MOW, ATH, WELL
    address = db.Column(db.String(200))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
class Route(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    origin_campus_id = db.Column(db.Integer, db.ForeignKey('campus.id'))
    destination_campus_id = db.Column(db.Integer, db.ForeignKey('campus.id'))
    duration_minutes = db.Column(db.Integer)  # Estimated travel time
    is_active = db.Column(db.Boolean, default=True)
    
    origin_campus = db.relationship('Campus', foreign_keys=[origin_campus_id])
    destination_campus = db.relationship('Campus', foreign_keys=[destination_campus_id])
    
class Bus(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bus_number = db.Column(db.String(10))
    route_id = db.Column(db.Integer, db.ForeignKey('route.id'))
    driver_name = db.Column(db.String(100))
    capacity = db.Column(db.Integer, default=60)
    status = db.Column(db.String(20))  # 'on_time', 'delayed', 'early', 'out_of_service'
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    current_stop = db.Column(db.String(100))
    next_stop = db.Column(db.String(100))
    passenger_count = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    route = db.relationship('Route', backref='buses')

class Stop(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('route.id'))
    name = db.Column(db.String(100))
    order = db.Column(db.Integer)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    estimated_time_from_start = db.Column(db.Integer)  # Minutes from origin

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        seed_campuses()
        seed_routes_and_stops()
        seed_buses()

def seed_campuses():
    if Campus.query.count() == 0:
        campuses = [
            Campus(name="Bellville Campus", code="BELL", 
                   address="Symphony Way, Bellville, Cape Town",
                   latitude=-33.932, longitude=18.641),
            Campus(name="District Six Campus", code="D6",
                   address="Tennant Street, District Six, Cape Town",
                   latitude=-33.930, longitude=18.422),
            Campus(name="Granger Bay Campus", code="GRAN",
                   address="Beach Road, Granger Bay, Cape Town",
                   latitude=-33.899, longitude=18.412),
            Campus(name="Mowbray Campus", code="MOW",
                   address="Main Road, Mowbray, Cape Town",
                   latitude=-33.946, longitude=18.474),
            Campus(name="Athlone Campus", code="ATH",
                   address="Klipfontein Road, Athlone, Cape Town",
                   latitude=-33.962, longitude=18.506),
            Campus(name="Wellington Campus", code="WELL",
                   address="Church Street, Wellington",
                   latitude=-33.640, longitude=19.004)
        ]
        db.session.add_all(campuses)
        db.session.commit()

def seed_routes_and_stops():
    if Route.query.count() == 0:
        campuses = Campus.query.all()
        campus_dict = {c.code: c for c in campuses}
        
        # Define all inter-campus routes
        route_definitions = [
            # Bellville Routes
            {"name": "Bellville → District Six", "origin": "BELL", "dest": "D6", "duration": 35,
             "stops": [
                 ("Bellville Campus", -33.932, 18.641, 0),
                 ("Bellville Station", -33.928, 18.635, 5),
                 ("Parow Centre", -33.912, 18.590, 15),
                 ("Goodwood", -33.899, 18.548, 25),
                 ("District Six Campus", -33.930, 18.422, 35)
             ]},
            {"name": "Bellville → Mowbray", "origin": "BELL", "dest": "MOW", "duration": 30,
             "stops": [
                 ("Bellville Campus", -33.932, 18.641, 0),
                 ("Bellville Station", -33.928, 18.635, 5),
                 ("N1 City", -33.894, 18.559, 15),
                 ("Maitland", -33.924, 18.488, 25),
                 ("Mowbray Campus", -33.946, 18.474, 30)
             ]},
            {"name": "Bellville → Athlone", "origin": "BELL", "dest": "ATH", "duration": 40,
             "stops": [
                 ("Bellville Campus", -33.932, 18.641, 0),
                 ("Tygervalley", -33.873, 18.634, 10),
                 ("Parow Industria", -33.913, 18.572, 20),
                 ("Athlone Stadium", -33.960, 18.509, 35),
                 ("Athlone Campus", -33.962, 18.506, 40)
             ]},
            # District Six Routes
            {"name": "District Six → Bellville", "origin": "D6", "dest": "BELL", "duration": 35,
             "stops": [
                 ("District Six Campus", -33.930, 18.422, 0),
                 ("Observatory", -33.937, 18.471, 8),
                 ("Pinelands", -33.928, 18.508, 18),
                 ("Bellville Station", -33.928, 18.635, 30),
                 ("Bellville Campus", -33.932, 18.641, 35)
             ]},
            {"name": "District Six → Granger Bay", "origin": "D6", "dest": "GRAN", "duration": 15,
             "stops": [
                 ("District Six Campus", -33.930, 18.422, 0),
                 ("Cape Town Station", -33.922, 18.423, 5),
                 ("Waterfront", -33.906, 18.417, 10),
                 ("Granger Bay Campus", -33.899, 18.412, 15)
             ]},
            # Mowbray Routes
            {"name": "Mowbray → District Six", "origin": "MOW", "dest": "D6", "duration": 20,
             "stops": [
                 ("Mowbray Campus", -33.946, 18.474, 0),
                 ("Observatory", -33.937, 18.471, 8),
                 ("Woodstock", -33.931, 18.445, 15),
                 ("District Six Campus", -33.930, 18.422, 20)
             ]},
            {"name": "Mowbray → Athlone", "origin": "MOW", "dest": "ATH", "duration": 15,
             "stops": [
                 ("Mowbray Campus", -33.946, 18.474, 0),
                 ("Rondebosch", -33.962, 18.475, 5),
                 ("Athlone Campus", -33.962, 18.506, 15)
             ]},
            # Athlone Routes
            {"name": "Athlone → District Six", "origin": "ATH", "dest": "D6", "duration": 25,
             "stops": [
                 ("Athlone Campus", -33.962, 18.506, 0),
                 ("Gatesville", -33.955, 18.495, 8),
                 ("Salt River", -33.934, 18.456, 18),
                 ("District Six Campus", -33.930, 18.422, 25)
             ]},
            # Granger Bay Routes
            {"name": "Granger Bay → District Six", "origin": "GRAN", "dest": "D6", "duration": 15,
             "stops": [
                 ("Granger Bay Campus", -33.899, 18.412, 0),
                 ("Waterfront", -33.906, 18.417, 5),
                 ("Cape Town Station", -33.922, 18.423, 10),
                 ("District Six Campus", -33.930, 18.422, 15)
             ]},
            # Wellington Routes
            {"name": "Wellington → Bellville", "origin": "WELL", "dest": "BELL", "duration": 50,
             "stops": [
                 ("Wellington Campus", -33.640, 19.004, 0),
                 ("Paarl", -33.734, 18.962, 15),
                 ("Durbanville", -33.833, 18.649, 35),
                 ("Bellville Station", -33.928, 18.635, 45),
                 ("Bellville Campus", -33.932, 18.641, 50)
             ]}
        ]
        
        for route_def in route_definitions:
            origin = campus_dict[route_def["origin"]]
            dest = campus_dict[route_def["dest"]]
            
            route = Route(
                name=route_def["name"],
                origin_campus_id=origin.id,
                destination_campus_id=dest.id,
                duration_minutes=route_def["duration"]
            )
            db.session.add(route)
            db.session.flush()
            
            # Add stops for this route
            for stop_data in route_def["stops"]:
                stop = Stop(
                    route_id=route.id,
                    name=stop_data[0],
                    order=len(route_def["stops"]) - len(route_def["stops"]) + route_def["stops"].index(stop_data) + 1,
                    latitude=stop_data[1],
                    longitude=stop_data[2],
                    estimated_time_from_start=stop_data[3]
                )
                db.session.add(stop)
        
        db.session.commit()

def seed_buses():
    if Bus.query.count() == 0:
        routes = Route.query.all()
        bus_data = [
            {"number": "BUS-101", "route_index": 0, "status": "on_time", "passengers": 45},
            {"number": "BUS-102", "route_index": 3, "status": "on_time", "passengers": 38},
            {"number": "BUS-201", "route_index": 1, "status": "delayed", "passengers": 52},
            {"number": "BUS-301", "route_index": 5, "status": "on_time", "passengers": 30},
            {"number": "BUS-401", "route_index": 6, "status": "early", "passengers": 25},
            {"number": "BUS-501", "route_index": 8, "status": "on_time", "passengers": 42},
            {"number": "BUS-601", "route_index": 4, "status": "on_time", "passengers": 35},
            {"number": "BUS-701", "route_index": 9, "status": "on_time", "passengers": 28},
            {"number": "BUS-801", "route_index": 2, "status": "delayed", "passengers": 55},
            {"number": "BUS-901", "route_index": 7, "status": "on_time", "passengers": 33},
        ]
        
        for bus_entry in bus_data:
            route = routes[bus_entry["route_index"]]
            stops = Stop.query.filter_by(route_id=route.id).order_by(Stop.order).all()
            
            if stops:
                current_stop_index = random.randint(0, len(stops) - 1)
                current_stop = stops[current_stop_index]
                next_stop = stops[current_stop_index + 1] if current_stop_index < len(stops) - 1 else stops[current_stop_index]
                
                bus = Bus(
                    bus_number=bus_entry["number"],
                    route_id=route.id,
                    driver_name=f"Driver {random.randint(1, 50)}",
                    capacity=60,
                    status=bus_entry["status"],
                    latitude=current_stop.latitude + random.uniform(-0.001, 0.001),
                    longitude=current_stop.longitude + random.uniform(-0.001, 0.001),
                    current_stop=current_stop.name,
                    next_stop=next_stop.name,
                    passenger_count=bus_entry["passengers"]
                )
                db.session.add(bus)
        
        db.session.commit()
