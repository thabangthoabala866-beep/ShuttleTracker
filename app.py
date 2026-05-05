from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from database import db, init_db, User, Bus, Route, Stop, Campus
from datetime import datetime, timedelta
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'shuttle-tracker-cput-2024-secret'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cput_shuttle.db'

# Initialize database
init_db(app)

# Initialize Login Manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ===== AUTH ROUTES =====
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid email or password. Please try again.', 'error')
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
        
    if request.method == 'POST':
        student_number = request.form.get('student_number')
        email = request.form.get('email')
        full_name = request.form.get('full_name')
        password = request.form.get('password')
        campus_code = request.form.get('campus')
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            flash('Email already registered.', 'error')
            return redirect(url_for('signup'))
        
        if User.query.filter_by(student_number=student_number).first():
            flash('Student number already registered.', 'error')
            return redirect(url_for('signup'))
        
        # Create new user
        hashed_password = generate_password_hash(password)
        new_user = User(
            student_number=student_number,
            email=email,
            full_name=full_name,
            password_hash=hashed_password,
            campus=campus_code
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful! Please login to continue.', 'success')
        return redirect(url_for('login'))
    
    campuses = Campus.query.all()
    return render_template('signup.html', campuses=campuses)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# ===== MAIN PAGES =====
@app.route('/dashboard')
@login_required
def dashboard():
    campuses = Campus.query.all()
    return render_template('dashboard.html', campuses=campuses)

@app.route('/routes')
@login_required
def routes():
    all_routes = Route.query.filter_by(is_active=True).all()
    return render_template('routes.html', routes=all_routes)

@app.route('/profile')
@login_required
def profile():
    user_campus = Campus.query.filter_by(code=current_user.campus).first()
    return render_template('profile.html', campus=user_campus)

@app.route('/bus/<int:bus_id>')
@login_required
def bus_detail(bus_id):
    bus = Bus.query.get_or_404(bus_id)
    route = Route.query.get(bus.route_id)
    stops = Stop.query.filter_by(route_id=route.id).order_by(Stop.order).all()
    return render_template('bus_detail.html', bus=bus, route=route, stops=stops)

# ===== API ENDPOINTS =====
@app.route('/api/buses')
@login_required
def get_buses():
    campus_code = request.args.get('campus', '')
    
    if campus_code:
        # Get campus ID
        campus = Campus.query.filter_by(code=campus_code).first()
        if campus:
            # Filter buses originating or going to selected campus
            buses = Bus.query.join(Route).filter(
                (Route.origin_campus_id == campus.id) | 
                (Route.destination_campus_id == campus.id)
            ).all()
        else:
            buses = Bus.query.all()
    else:
        buses = Bus.query.all()
    
    bus_list = []
    for bus in buses:
        route = Route.query.get(bus.route_id)
        origin_campus = Campus.query.get(route.origin_campus_id)
        dest_campus = Campus.query.get(route.destination_campus_id)
        
        # Simulate real-time updates
        if bus.last_updated:
            time_diff = (datetime.utcnow() - bus.last_updated).seconds
            if time_diff > 30:
                # Update bus position slightly
                bus.latitude += random.uniform(-0.002, 0.002)
                bus.longitude += random.uniform(-0.002, 0.002)
                bus.passenger_count += random.randint(-2, 2)
                bus.passenger_count = max(0, min(bus.capacity, bus.passenger_count))
                bus.last_updated = datetime.utcnow()
                db.session.commit()
        
        bus_list.append({
            'id': bus.id,
            'bus_number': bus.bus_number,
            'route_name': route.name,
            'origin': origin_campus.name,
            'destination': dest_campus.name,
            'status': bus.status,
            'current_stop': bus.current_stop,
            'next_stop': bus.next_stop,
            'passenger_count': bus.passenger_count,
            'capacity': bus.capacity,
            'latitude': bus.latitude,
            'longitude': bus.longitude,
            'driver_name': bus.driver_name
        })
    
    return jsonify(bus_list)

@app.route('/api/bus/<int:bus_id>')
@login_required
def get_bus_detail(bus_id):
    bus = Bus.query.get_or_404(bus_id)
    route = Route.query.get(bus.route_id)
    stops = Stop.query.filter_by(route_id=route.id).order_by(Stop.order).all()
    origin_campus = Campus.query.get(route.origin_campus_id)
    dest_campus = Campus.query.get(route.destination_campus_id)
    
    # Calculate ETAs
    stop_list = []
    current_time = datetime.now()
    
    for stop in stops:
        eta = current_time + timedelta(minutes=random.randint(2, 15))
        stop_list.append({
            'name': stop.name,
            'order': stop.order,
            'latitude': stop.latitude,
            'longitude': stop.longitude,
            'eta': eta.strftime('%H:%M'),
            'is_current': stop.name == bus.current_stop,
            'is_next': stop.name == bus.next_stop
        })
    
    return jsonify({
        'bus_number': bus.bus_number,
        'status': bus.status,
        'latitude': bus.latitude,
        'longitude': bus.longitude,
        'passenger_count': bus.passenger_count,
        'capacity': bus.capacity,
        'driver_name': bus.driver_name,
        'current_stop': bus.current_stop,
        'next_stop': bus.next_stop,
        'route': {
            'name': route.name,
            'origin': origin_campus.name,
            'destination': dest_campus.name,
            'duration': route.duration_minutes
        },
        'stops': stop_list
    })

@app.route('/api/campuses')
@login_required
def get_campuses():
    campuses = Campus.query.all()
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'code': c.code,
        'latitude': c.latitude,
        'longitude': c.longitude
    } for c in campuses])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
