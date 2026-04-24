require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting database seed...');

    // ─── Drop all tables ───
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS grid_topology CASCADE;
      DROP TABLE IF EXISTS regulatory_compliance CASCADE;
      DROP TABLE IF EXISTS maintenance_schedule CASCADE;
      DROP TABLE IF EXISTS weather_impact CASCADE;
      DROP TABLE IF EXISTS energy_trading CASCADE;
      DROP TABLE IF EXISTS outage_management CASCADE;
      DROP TABLE IF EXISTS voltage_regulation CASCADE;
      DROP TABLE IF EXISTS smart_meters CASCADE;
      DROP TABLE IF EXISTS carbon_emissions CASCADE;
      DROP TABLE IF EXISTS power_flows CASCADE;
      DROP TABLE IF EXISTS energy_storage CASCADE;
      DROP TABLE IF EXISTS fault_detections CASCADE;
      DROP TABLE IF EXISTS demand_response CASCADE;
      DROP TABLE IF EXISTS renewable_sources CASCADE;
      DROP TABLE IF EXISTS load_forecasts CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // ─── Create users table ───
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (email, password, name, role)
      VALUES ($1, $2, $3, $4);
    `, ['admin@energygrid.com', hashedPassword, 'Admin User', 'admin']);
    console.log('  -> Inserted demo user (admin@energygrid.com / admin123)');

    // ─── 1. load_forecasts ───
    console.log('Creating load_forecasts table...');
    await client.query(`
      CREATE TABLE load_forecasts (
        id SERIAL PRIMARY KEY,
        region VARCHAR(100),
        current_load_mw DECIMAL,
        predicted_load_mw DECIMAL,
        forecast_time TIMESTAMP,
        confidence DECIMAL,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO load_forecasts (region, current_load_mw, predicted_load_mw, forecast_time, confidence, status) VALUES
      ('New York City, NY', 11200, 11850, '2025-07-15 14:00:00', 0.94, 'active'),
      ('Los Angeles, CA', 8900, 9300, '2025-07-15 15:00:00', 0.91, 'active'),
      ('Chicago, IL', 6700, 7100, '2025-07-15 16:00:00', 0.89, 'active'),
      ('Houston, TX', 9500, 10200, '2025-08-01 13:00:00', 0.93, 'pending'),
      ('Phoenix, AZ', 7800, 8400, '2025-08-01 14:00:00', 0.88, 'active'),
      ('Philadelphia, PA', 5400, 5700, '2025-07-20 12:00:00', 0.92, 'completed'),
      ('San Antonio, TX', 4200, 4600, '2025-07-20 13:00:00', 0.87, 'active'),
      ('San Diego, CA', 3800, 4100, '2025-07-25 11:00:00', 0.90, 'active'),
      ('Dallas, TX', 7200, 7800, '2025-08-05 15:00:00', 0.86, 'pending'),
      ('San Jose, CA', 3100, 3400, '2025-08-05 16:00:00', 0.93, 'active'),
      ('Austin, TX', 4500, 4900, '2025-08-10 14:00:00', 0.91, 'active'),
      ('Jacksonville, FL', 3600, 3900, '2025-08-10 15:00:00', 0.85, 'completed'),
      ('Fort Worth, TX', 3300, 3700, '2025-08-15 13:00:00', 0.88, 'active'),
      ('Columbus, OH', 4100, 4400, '2025-08-15 14:00:00', 0.90, 'pending'),
      ('Charlotte, NC', 3900, 4200, '2025-08-20 12:00:00', 0.92, 'active'),
      ('Indianapolis, IN', 3500, 3800, '2025-08-20 13:00:00', 0.87, 'active');
    `);
    console.log('  -> Seeded 16 load_forecasts');

    // ─── 2. renewable_sources ───
    console.log('Creating renewable_sources table...');
    await client.query(`
      CREATE TABLE renewable_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        type VARCHAR(50),
        capacity_mw DECIMAL,
        current_output_mw DECIMAL,
        location VARCHAR(100),
        status VARCHAR(50),
        efficiency DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO renewable_sources (name, type, capacity_mw, current_output_mw, location, status, efficiency) VALUES
      ('Mojave Solar Farm', 'solar', 550, 420, 'Barstow, CA', 'online', 0.76),
      ('Altamont Wind Pass', 'wind', 320, 245, 'Livermore, CA', 'online', 0.77),
      ('Grand Coulee Hydro', 'hydro', 6809, 5200, 'Grand Coulee, WA', 'online', 0.92),
      ('The Geysers Geothermal', 'geothermal', 900, 725, 'Santa Rosa, CA', 'online', 0.81),
      ('Topaz Solar Farm', 'solar', 580, 390, 'San Luis Obispo, CA', 'online', 0.67),
      ('Shepherds Flat Wind', 'wind', 845, 610, 'Arlington, OR', 'online', 0.72),
      ('Hoover Dam Hydro', 'hydro', 2080, 1600, 'Boulder City, NV', 'online', 0.87),
      ('Puna Geothermal Venture', 'geothermal', 38, 30, 'Pahoa, HI', 'maintenance', 0.79),
      ('Solar Star', 'solar', 579, 450, 'Rosamond, CA', 'online', 0.78),
      ('Alta Wind Energy Center', 'wind', 1548, 980, 'Tehachapi, CA', 'online', 0.63),
      ('Glen Canyon Dam', 'hydro', 1320, 1050, 'Page, AZ', 'online', 0.80),
      ('Coso Geothermal', 'geothermal', 270, 215, 'Inyo County, CA', 'online', 0.80),
      ('Desert Sunlight Solar', 'solar', 550, 310, 'Desert Center, CA', 'degraded', 0.56),
      ('Roscoe Wind Farm', 'wind', 782, 530, 'Roscoe, TX', 'online', 0.68),
      ('Niagara Falls Hydro', 'hydro', 2525, 2100, 'Niagara Falls, NY', 'online', 0.83),
      ('Neal Hot Springs Geothermal', 'geothermal', 22, 18, 'Vale, OR', 'online', 0.82);
    `);
    console.log('  -> Seeded 16 renewable_sources');

    // ─── 3. demand_response ───
    console.log('Creating demand_response table...');
    await client.query(`
      CREATE TABLE demand_response (
        id SERIAL PRIMARY KEY,
        program_name VARCHAR(100),
        participant_count INTEGER,
        reduction_mw DECIMAL,
        status VARCHAR(50),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        incentive_rate DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO demand_response (program_name, participant_count, reduction_mw, status, start_time, end_time, incentive_rate) VALUES
      ('NYC Peak Shaving Program', 45000, 320, 'active', '2025-07-15 12:00:00', '2025-07-15 18:00:00', 0.15),
      ('SoCal Smart Thermostat DR', 120000, 580, 'active', '2025-07-15 13:00:00', '2025-07-15 20:00:00', 0.12),
      ('Texas Industrial Curtailment', 800, 1200, 'active', '2025-08-01 14:00:00', '2025-08-01 19:00:00', 0.22),
      ('PJM Emergency Load Response', 35000, 750, 'standby', '2025-08-05 11:00:00', '2025-08-05 17:00:00', 0.18),
      ('Florida Commercial HVAC DR', 15000, 410, 'active', '2025-07-20 12:00:00', '2025-07-20 16:00:00', 0.10),
      ('Midwest Agricultural Pump DR', 5200, 280, 'completed', '2025-06-10 08:00:00', '2025-06-10 14:00:00', 0.14),
      ('New England Winter Peak DR', 28000, 520, 'scheduled', '2025-12-15 06:00:00', '2025-12-15 10:00:00', 0.20),
      ('Arizona EV Charging Flex', 62000, 190, 'active', '2025-07-25 15:00:00', '2025-07-25 21:00:00', 0.08),
      ('Pacific NW Aluminum Smelter DR', 12, 850, 'standby', '2025-08-10 13:00:00', '2025-08-10 17:00:00', 0.25),
      ('Georgia Residential Pool Pump DR', 42000, 160, 'active', '2025-07-18 11:00:00', '2025-07-18 15:00:00', 0.06),
      ('MISO Critical Peak Pricing', 89000, 1100, 'active', '2025-08-03 14:00:00', '2025-08-03 20:00:00', 0.30),
      ('Colorado Ski Resort DR', 150, 95, 'completed', '2025-01-20 17:00:00', '2025-01-20 21:00:00', 0.11),
      ('CAISO Flex Alert', 200000, 2200, 'active', '2025-07-28 16:00:00', '2025-07-28 21:00:00', 0.17),
      ('Virginia Data Center DR', 45, 680, 'standby', '2025-08-12 12:00:00', '2025-08-12 16:00:00', 0.35),
      ('Ohio Steel Mill Interruptible', 25, 540, 'active', '2025-07-30 13:00:00', '2025-07-30 18:00:00', 0.28),
      ('Washington EV Fleet DR', 8500, 130, 'scheduled', '2025-09-01 07:00:00', '2025-09-01 11:00:00', 0.09);
    `);
    console.log('  -> Seeded 16 demand_response');

    // ─── 4. fault_detections ───
    console.log('Creating fault_detections table...');
    await client.query(`
      CREATE TABLE fault_detections (
        id SERIAL PRIMARY KEY,
        fault_type VARCHAR(100),
        location VARCHAR(100),
        severity VARCHAR(50),
        detected_at TIMESTAMP,
        status VARCHAR(50),
        confidence DECIMAL,
        affected_area VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO fault_detections (fault_type, location, severity, detected_at, status, confidence, affected_area) VALUES
      ('Line-to-ground fault', 'Substation Alpha, Houston, TX', 'critical', '2025-07-10 03:22:00', 'active', 0.97, 'Downtown Houston'),
      ('Transformer overheating', 'Grid Node 47, Phoenix, AZ', 'high', '2025-07-11 14:15:00', 'investigating', 0.92, 'East Phoenix'),
      ('Insulation breakdown', 'Feeder 12, Chicago, IL', 'medium', '2025-07-12 09:45:00', 'resolved', 0.88, 'South Loop'),
      ('Phase imbalance', 'Distribution Hub 8, Miami, FL', 'low', '2025-07-13 16:30:00', 'resolved', 0.84, 'Coral Gables'),
      ('Arc flash detected', 'Switchgear Room B, Atlanta, GA', 'critical', '2025-07-14 02:10:00', 'active', 0.96, 'Midtown Atlanta'),
      ('Capacitor bank failure', 'Substation Bravo, Denver, CO', 'high', '2025-07-15 11:55:00', 'investigating', 0.90, 'Aurora'),
      ('Conductor sag', 'Transmission Line T-45, Fresno, CA', 'medium', '2025-07-16 15:20:00', 'active', 0.85, 'Central Valley'),
      ('Ground fault relay trip', 'Relay Station 9, Seattle, WA', 'high', '2025-07-17 07:40:00', 'resolved', 0.93, 'Capitol Hill'),
      ('Harmonic distortion', 'Industrial Zone 3, Detroit, MI', 'low', '2025-07-18 10:05:00', 'investigating', 0.78, 'Dearborn'),
      ('Cable splice failure', 'Underground Vault 22, Boston, MA', 'critical', '2025-07-19 01:30:00', 'active', 0.95, 'Back Bay'),
      ('Voltage sag event', 'Feeder 7, San Francisco, CA', 'medium', '2025-07-20 18:45:00', 'resolved', 0.87, 'SOMA District'),
      ('Breaker failure', 'Substation Charlie, Minneapolis, MN', 'high', '2025-07-21 04:15:00', 'active', 0.91, 'Uptown'),
      ('Lightning surge', 'Tower 118, Orlando, FL', 'critical', '2025-07-22 20:30:00', 'investigating', 0.98, 'Lake Nona'),
      ('Neutral conductor break', 'Pole 2045, Nashville, TN', 'medium', '2025-07-23 12:00:00', 'resolved', 0.82, 'East Nashville'),
      ('Switch malfunction', 'Recloser R-31, Portland, OR', 'low', '2025-07-24 08:20:00', 'investigating', 0.80, 'Pearl District'),
      ('Overloaded circuit', 'Panel C-9, Las Vegas, NV', 'high', '2025-07-25 22:10:00', 'active', 0.89, 'The Strip');
    `);
    console.log('  -> Seeded 16 fault_detections');

    // ─── 5. energy_storage ───
    console.log('Creating energy_storage table...');
    await client.query(`
      CREATE TABLE energy_storage (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        type VARCHAR(50),
        capacity_mwh DECIMAL,
        charge_level DECIMAL,
        location VARCHAR(100),
        status VARCHAR(50),
        cycles INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO energy_storage (name, type, capacity_mwh, charge_level, location, status, cycles) VALUES
      ('Moss Landing BESS', 'lithium-ion', 1600, 0.82, 'Moss Landing, CA', 'discharging', 1240),
      ('Bath County PSH', 'pumped-hydro', 24000, 0.71, 'Warm Springs, VA', 'charging', 8500),
      ('Beacon Power Flywheel', 'flywheel', 20, 0.95, 'Stephentown, NY', 'standby', 450000),
      ('Dalian Flow Battery', 'flow-battery', 800, 0.55, 'San Diego, CA', 'discharging', 3200),
      ('Gateway BESS', 'lithium-ion', 250, 0.90, 'Otay Mesa, CA', 'charging', 890),
      ('Ludington Pumped Storage', 'pumped-hydro', 19000, 0.63, 'Ludington, MI', 'discharging', 12000),
      ('Hazle Spindle Flywheel', 'flywheel', 20, 0.88, 'Hazle Township, PA', 'online', 380000),
      ('ESS Inc Iron Flow', 'flow-battery', 75, 0.42, 'Wilsonville, OR', 'charging', 1800),
      ('Vistra Mega BESS', 'lithium-ion', 1200, 0.67, 'Moss Landing, CA', 'discharging', 950),
      ('Raccoon Mountain PSH', 'pumped-hydro', 16000, 0.78, 'Chattanooga, TN', 'standby', 9200),
      ('Amber Kinetics Flywheel', 'flywheel', 32, 0.91, 'Union City, CA', 'discharging', 290000),
      ('Sumitomo Vanadium Flow', 'flow-battery', 60, 0.38, 'Everett, WA', 'maintenance', 2400),
      ('Manatee BESS', 'lithium-ion', 900, 0.74, 'Parrish, FL', 'discharging', 720),
      ('Helms Pumped Storage', 'pumped-hydro', 12000, 0.85, 'Fresno County, CA', 'charging', 7800),
      ('Stornetic Flywheel Array', 'flywheel', 15, 0.60, 'Austin, TX', 'online', 520000),
      ('Largo Clean Energy Flow', 'flow-battery', 120, 0.50, 'Wilmington, MA', 'discharging', 2900);
    `);
    console.log('  -> Seeded 16 energy_storage');

    // ─── 6. power_flows ───
    console.log('Creating power_flows table...');
    await client.query(`
      CREATE TABLE power_flows (
        id SERIAL PRIMARY KEY,
        line_id VARCHAR(50),
        from_node VARCHAR(100),
        to_node VARCHAR(100),
        power_mw DECIMAL,
        voltage_kv DECIMAL,
        current_a DECIMAL,
        loss_mw DECIMAL,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO power_flows (line_id, from_node, to_node, power_mw, voltage_kv, current_a, loss_mw, status) VALUES
      ('TL-001', 'Palo Verde Generating Station', 'Phoenix West Substation', 1250, 500, 1445, 12.5, 'normal'),
      ('TL-002', 'Grand Coulee Dam', 'Seattle North Hub', 2800, 765, 2115, 28.0, 'normal'),
      ('TL-003', 'Hoover Dam', 'Las Vegas Distribution', 890, 345, 1490, 8.9, 'normal'),
      ('TL-004', 'Indian Point Substation', 'NYC Metro Grid', 1650, 345, 2764, 16.5, 'congested'),
      ('TL-005', 'Scherer Plant', 'Atlanta Central Hub', 1800, 500, 2082, 18.0, 'normal'),
      ('TL-006', 'South Texas Nuclear', 'Houston Industrial Zone', 2100, 345, 3516, 21.0, 'normal'),
      ('TL-007', 'Navajo Switchyard', 'Albuquerque Grid', 750, 345, 1256, 7.5, 'degraded'),
      ('TL-008', 'Browns Ferry Nuclear', 'Nashville Distribution', 1950, 500, 2255, 19.5, 'normal'),
      ('TL-009', 'Diablo Canyon', 'San Luis Obispo Hub', 1100, 500, 1272, 11.0, 'normal'),
      ('TL-010', 'Comanche Peak Nuclear', 'Dallas-Fort Worth Grid', 2300, 345, 3851, 23.0, 'congested'),
      ('TL-011', 'Columbia Generating', 'Portland Metro Hub', 1160, 500, 1341, 11.6, 'normal'),
      ('TL-012', 'Calvert Cliffs Nuclear', 'Baltimore Distribution', 1700, 500, 1966, 17.0, 'normal'),
      ('TL-013', 'Limerick Generating', 'Philadelphia Grid', 2200, 500, 2544, 22.0, 'normal'),
      ('TL-014', 'Turkey Point Nuclear', 'Miami-Dade Distribution', 1400, 345, 2344, 14.0, 'degraded'),
      ('TL-015', 'Prairie Island Nuclear', 'Minneapolis Hub', 1060, 345, 1775, 10.6, 'normal'),
      ('TL-016', 'Vogtle Nuclear Plant', 'Savannah Distribution', 2300, 500, 2660, 23.0, 'normal');
    `);
    console.log('  -> Seeded 16 power_flows');

    // ─── 7. carbon_emissions ───
    console.log('Creating carbon_emissions table...');
    await client.query(`
      CREATE TABLE carbon_emissions (
        id SERIAL PRIMARY KEY,
        source VARCHAR(100),
        emission_type VARCHAR(50),
        amount_tons DECIMAL,
        recorded_at TIMESTAMP,
        reduction_target DECIMAL,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO carbon_emissions (source, emission_type, amount_tons, recorded_at, reduction_target, status) VALUES
      ('Harrison Coal Plant, WV', 'CO2', 4500, '2025-07-01 00:00:00', 0.30, 'exceeding'),
      ('Navajo Gas Turbine, AZ', 'CO2', 1200, '2025-07-01 00:00:00', 0.25, 'on-track'),
      ('Scherer Coal Plant, GA', 'CO2', 5800, '2025-07-01 00:00:00', 0.35, 'exceeding'),
      ('Martin Drake Station, CO', 'SO2', 85, '2025-07-01 00:00:00', 0.40, 'behind'),
      ('Jim Bridger Plant, WY', 'NOx', 120, '2025-07-01 00:00:00', 0.20, 'on-track'),
      ('Colstrip Power, MT', 'CO2', 3200, '2025-07-01 00:00:00', 0.28, 'on-track'),
      ('Parish Gas Turbine, TX', 'CO2', 2100, '2025-06-01 00:00:00', 0.22, 'ahead'),
      ('Labadie Power, MO', 'SO2', 95, '2025-06-01 00:00:00', 0.38, 'behind'),
      ('Monroe Coal Plant, MI', 'CO2', 4100, '2025-06-01 00:00:00', 0.32, 'on-track'),
      ('Crystal River Gas, FL', 'NOx', 65, '2025-06-01 00:00:00', 0.18, 'ahead'),
      ('Intermountain Power, UT', 'CO2', 2900, '2025-06-01 00:00:00', 0.45, 'behind'),
      ('Gibson Generating, IN', 'CO2', 3800, '2025-05-01 00:00:00', 0.27, 'on-track'),
      ('Centralia Coal, WA', 'SO2', 42, '2025-05-01 00:00:00', 0.50, 'ahead'),
      ('Gavin Power Plant, OH', 'CO2', 4200, '2025-05-01 00:00:00', 0.33, 'exceeding'),
      ('Cumberland Fossil, TN', 'NOx', 110, '2025-05-01 00:00:00', 0.24, 'on-track'),
      ('Sherburne County, MN', 'CO2', 2600, '2025-05-01 00:00:00', 0.30, 'on-track');
    `);
    console.log('  -> Seeded 16 carbon_emissions');

    // ─── 8. smart_meters ───
    console.log('Creating smart_meters table...');
    await client.query(`
      CREATE TABLE smart_meters (
        id SERIAL PRIMARY KEY,
        meter_id VARCHAR(50),
        location VARCHAR(100),
        consumption_kwh DECIMAL,
        peak_demand_kw DECIMAL,
        status VARCHAR(50),
        last_reading TIMESTAMP,
        anomaly_score DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO smart_meters (meter_id, location, consumption_kwh, peak_demand_kw, status, last_reading, anomaly_score) VALUES
      ('SM-10001', 'Manhattan, New York, NY', 1245.8, 18.5, 'online', '2025-07-15 14:30:00', 0.05),
      ('SM-10002', 'Beverly Hills, Los Angeles, CA', 980.3, 14.2, 'online', '2025-07-15 14:30:00', 0.03),
      ('SM-10003', 'Lincoln Park, Chicago, IL', 1102.6, 16.8, 'online', '2025-07-15 14:30:00', 0.12),
      ('SM-10004', 'River Oaks, Houston, TX', 1580.2, 22.1, 'online', '2025-07-15 14:30:00', 0.08),
      ('SM-10005', 'Scottsdale, Phoenix, AZ', 1820.5, 25.3, 'warning', '2025-07-15 14:30:00', 0.45),
      ('SM-10006', 'Rittenhouse, Philadelphia, PA', 890.7, 12.6, 'online', '2025-07-15 14:25:00', 0.02),
      ('SM-10007', 'Alamo Heights, San Antonio, TX', 1350.4, 19.0, 'online', '2025-07-15 14:25:00', 0.07),
      ('SM-10008', 'La Jolla, San Diego, CA', 760.1, 11.5, 'online', '2025-07-15 14:25:00', 0.04),
      ('SM-10009', 'Uptown, Dallas, TX', 1420.9, 20.4, 'online', '2025-07-15 14:25:00', 0.06),
      ('SM-10010', 'Willow Glen, San Jose, CA', 680.5, 9.8, 'offline', '2025-07-14 22:15:00', 0.88),
      ('SM-10011', 'Zilker, Austin, TX', 1190.3, 17.2, 'online', '2025-07-15 14:20:00', 0.09),
      ('SM-10012', 'San Marco, Jacksonville, FL', 1050.7, 15.1, 'online', '2025-07-15 14:20:00', 0.11),
      ('SM-10013', 'Sundance Square, Fort Worth, TX', 1280.6, 18.0, 'online', '2025-07-15 14:20:00', 0.04),
      ('SM-10014', 'German Village, Columbus, OH', 920.4, 13.3, 'online', '2025-07-15 14:15:00', 0.03),
      ('SM-10015', 'Dilworth, Charlotte, NC', 1010.8, 14.7, 'warning', '2025-07-15 14:15:00', 0.52),
      ('SM-10016', 'Broad Ripple, Indianapolis, IN', 870.2, 12.1, 'online', '2025-07-15 14:15:00', 0.06);
    `);
    console.log('  -> Seeded 16 smart_meters');

    // ─── 9. voltage_regulation ───
    console.log('Creating voltage_regulation table...');
    await client.query(`
      CREATE TABLE voltage_regulation (
        id SERIAL PRIMARY KEY,
        substation VARCHAR(100),
        nominal_kv DECIMAL,
        actual_kv DECIMAL,
        tap_position INTEGER,
        regulator_type VARCHAR(50),
        status VARCHAR(50),
        deviation DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO voltage_regulation (substation, nominal_kv, actual_kv, tap_position, regulator_type, status, deviation) VALUES
      ('Eastwood Substation, Houston, TX', 138, 137.2, 5, 'load-tap-changer', 'normal', -0.58),
      ('Northgate Substation, Seattle, WA', 230, 229.1, 3, 'step-voltage-regulator', 'normal', -0.39),
      ('Riverside Substation, Phoenix, AZ', 69, 70.8, 8, 'load-tap-changer', 'warning', 2.61),
      ('Midtown Substation, Atlanta, GA', 115, 114.6, 4, 'auto-transformer', 'normal', -0.35),
      ('Lakefront Substation, Chicago, IL', 345, 342.8, 6, 'load-tap-changer', 'normal', -0.64),
      ('Downtown Substation, Denver, CO', 138, 140.5, 9, 'step-voltage-regulator', 'warning', 1.81),
      ('Harbor Substation, San Diego, CA', 69, 68.7, 3, 'load-tap-changer', 'normal', -0.43),
      ('Central Substation, Dallas, TX', 230, 228.5, 5, 'auto-transformer', 'normal', -0.65),
      ('Bayview Substation, San Francisco, CA', 115, 116.2, 7, 'load-tap-changer', 'normal', 1.04),
      ('Summit Substation, Portland, OR', 69, 69.3, 4, 'step-voltage-regulator', 'normal', 0.43),
      ('Meadows Substation, Nashville, TN', 138, 135.8, 2, 'load-tap-changer', 'critical', -1.59),
      ('Industrial Substation, Detroit, MI', 230, 231.4, 6, 'auto-transformer', 'normal', 0.61),
      ('Uptown Substation, Charlotte, NC', 115, 114.8, 5, 'load-tap-changer', 'normal', -0.17),
      ('Westfield Substation, Indianapolis, IN', 69, 67.5, 1, 'step-voltage-regulator', 'warning', -2.17),
      ('Capitol Substation, Austin, TX', 138, 137.8, 4, 'load-tap-changer', 'normal', -0.14),
      ('Crosstown Substation, Minneapolis, MN', 230, 229.6, 5, 'auto-transformer', 'normal', -0.17);
    `);
    console.log('  -> Seeded 16 voltage_regulation');

    // ─── 10. outage_management ───
    console.log('Creating outage_management table...');
    await client.query(`
      CREATE TABLE outage_management (
        id SERIAL PRIMARY KEY,
        outage_id VARCHAR(50),
        area VARCHAR(100),
        affected_customers INTEGER,
        cause VARCHAR(100),
        start_time TIMESTAMP,
        est_restoration TIMESTAMP,
        status VARCHAR(50),
        crew_assigned VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO outage_management (outage_id, area, affected_customers, cause, start_time, est_restoration, status, crew_assigned) VALUES
      ('OUT-2025-001', 'Midtown Manhattan, NY', 12500, 'Underground cable failure', '2025-07-10 02:15:00', '2025-07-10 08:00:00', 'active', 'Alpha Crew - Unit 7'),
      ('OUT-2025-002', 'South Beach, Miami, FL', 8400, 'Hurricane debris on lines', '2025-07-11 18:30:00', '2025-07-12 14:00:00', 'active', 'Storm Response Team 3'),
      ('OUT-2025-003', 'Downtown Portland, OR', 3200, 'Transformer explosion', '2025-07-12 09:45:00', '2025-07-12 16:00:00', 'resolved', 'Bravo Crew - Unit 12'),
      ('OUT-2025-004', 'Buckhead, Atlanta, GA', 6100, 'Vehicle struck utility pole', '2025-07-13 22:10:00', '2025-07-14 04:00:00', 'resolved', 'Emergency Crew - Unit 4'),
      ('OUT-2025-005', 'Scottsdale, Phoenix, AZ', 15000, 'Heat-related equipment failure', '2025-07-14 15:00:00', '2025-07-14 22:00:00', 'active', 'Delta Crew - Unit 9'),
      ('OUT-2025-006', 'Capitol Hill, Seattle, WA', 4800, 'Fallen tree on power line', '2025-07-15 06:30:00', '2025-07-15 12:00:00', 'resolved', 'Charlie Crew - Unit 2'),
      ('OUT-2025-007', 'River North, Chicago, IL', 9200, 'Switchgear malfunction', '2025-07-16 11:00:00', '2025-07-16 18:00:00', 'active', 'Foxtrot Crew - Unit 5'),
      ('OUT-2025-008', 'Montrose, Houston, TX', 7600, 'Lightning strike on substation', '2025-07-17 20:45:00', '2025-07-18 06:00:00', 'active', 'Golf Crew - Unit 11'),
      ('OUT-2025-009', 'Nob Hill, San Francisco, CA', 2800, 'Planned maintenance upgrade', '2025-08-01 08:00:00', '2025-08-01 16:00:00', 'scheduled', 'Maintenance Crew A'),
      ('OUT-2025-010', 'Cherry Creek, Denver, CO', 5500, 'Wildfire damage to lines', '2025-07-18 14:20:00', '2025-07-19 10:00:00', 'active', 'Wildfire Response Unit 1'),
      ('OUT-2025-011', 'Germantown, Nashville, TN', 3100, 'Ice storm damage', '2025-01-22 04:00:00', '2025-01-22 18:00:00', 'resolved', 'Hotel Crew - Unit 8'),
      ('OUT-2025-012', 'Lakeview, New Orleans, LA', 11000, 'Flooding at substation', '2025-06-15 07:30:00', '2025-06-16 20:00:00', 'resolved', 'Flood Response Team 2'),
      ('OUT-2025-013', 'Ballston, Arlington, VA', 4200, 'Planned grid modernization', '2025-08-10 06:00:00', '2025-08-10 14:00:00', 'scheduled', 'Modernization Team C'),
      ('OUT-2025-014', 'Coconut Grove, Miami, FL', 6800, 'Overloaded distribution feeder', '2025-07-19 16:00:00', '2025-07-19 22:00:00', 'active', 'India Crew - Unit 6'),
      ('OUT-2025-015', 'Pearl District, Portland, OR', 1900, 'Underground vault fire', '2025-07-20 03:15:00', '2025-07-20 11:00:00', 'resolved', 'Juliet Crew - Unit 3'),
      ('OUT-2025-016', 'Midtown, Detroit, MI', 8900, 'Aging infrastructure failure', '2025-07-21 10:00:00', '2025-07-21 20:00:00', 'active', 'Kilo Crew - Unit 10');
    `);
    console.log('  -> Seeded 16 outage_management');

    // ─── 11. energy_trading ───
    console.log('Creating energy_trading table...');
    await client.query(`
      CREATE TABLE energy_trading (
        id SERIAL PRIMARY KEY,
        trade_id VARCHAR(50),
        type VARCHAR(50),
        energy_mwh DECIMAL,
        price_per_mwh DECIMAL,
        counterparty VARCHAR(100),
        traded_at TIMESTAMP,
        status VARCHAR(50),
        market VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO energy_trading (trade_id, type, energy_mwh, price_per_mwh, counterparty, traded_at, status, market) VALUES
      ('TRD-20250701-001', 'sell', 500, 42.50, 'Pacific Gas & Electric', '2025-07-01 08:00:00', 'completed', 'CAISO'),
      ('TRD-20250701-002', 'buy', 320, 38.75, 'Duke Energy', '2025-07-01 09:15:00', 'completed', 'PJM'),
      ('TRD-20250702-003', 'sell', 750, 55.20, 'Southern California Edison', '2025-07-02 10:30:00', 'completed', 'CAISO'),
      ('TRD-20250702-004', 'buy', 1200, 31.00, 'Exelon Generation', '2025-07-02 11:45:00', 'completed', 'PJM'),
      ('TRD-20250703-005', 'sell', 280, 67.80, 'Con Edison', '2025-07-03 14:00:00', 'completed', 'NYISO'),
      ('TRD-20250703-006', 'buy', 900, 28.50, 'NextEra Energy', '2025-07-03 15:30:00', 'completed', 'ERCOT'),
      ('TRD-20250705-007', 'sell', 1500, 48.90, 'AES Corporation', '2025-07-05 08:45:00', 'pending', 'MISO'),
      ('TRD-20250705-008', 'buy', 640, 35.25, 'Dominion Energy', '2025-07-05 10:00:00', 'completed', 'PJM'),
      ('TRD-20250706-009', 'sell', 380, 72.10, 'National Grid', '2025-07-06 13:00:00', 'completed', 'ISO-NE'),
      ('TRD-20250706-010', 'buy', 1100, 29.80, 'Vistra Energy', '2025-07-06 14:15:00', 'pending', 'ERCOT'),
      ('TRD-20250708-011', 'sell', 850, 44.30, 'Sempra Energy', '2025-07-08 09:00:00', 'completed', 'CAISO'),
      ('TRD-20250708-012', 'buy', 450, 51.60, 'Eversource Energy', '2025-07-08 11:30:00', 'completed', 'ISO-NE'),
      ('TRD-20250710-013', 'sell', 2000, 39.90, 'Entergy Corporation', '2025-07-10 08:00:00', 'completed', 'MISO'),
      ('TRD-20250710-014', 'buy', 720, 46.75, 'Consolidated Edison', '2025-07-10 10:45:00', 'cancelled', 'NYISO'),
      ('TRD-20250712-015', 'sell', 560, 58.40, 'FirstEnergy Corp', '2025-07-12 12:00:00', 'pending', 'PJM'),
      ('TRD-20250712-016', 'buy', 1350, 33.15, 'CPS Energy', '2025-07-12 13:30:00', 'completed', 'ERCOT');
    `);
    console.log('  -> Seeded 16 energy_trading');

    // ─── 12. weather_impact ───
    console.log('Creating weather_impact table...');
    await client.query(`
      CREATE TABLE weather_impact (
        id SERIAL PRIMARY KEY,
        region VARCHAR(100),
        weather_type VARCHAR(50),
        severity VARCHAR(50),
        impact_on_generation DECIMAL,
        impact_on_demand DECIMAL,
        forecast_date TIMESTAMP,
        confidence DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO weather_impact (region, weather_type, severity, impact_on_generation, impact_on_demand, forecast_date, confidence) VALUES
      ('Southern California', 'heatwave', 'severe', -5.2, 18.5, '2025-07-15 00:00:00', 0.94),
      ('Gulf Coast Texas', 'hurricane', 'extreme', -35.0, -12.0, '2025-08-20 00:00:00', 0.78),
      ('Pacific Northwest', 'cloud cover', 'moderate', -22.0, -3.5, '2025-07-10 00:00:00', 0.88),
      ('Great Plains', 'high winds', 'moderate', 15.0, -2.0, '2025-07-12 00:00:00', 0.91),
      ('Northeast Corridor', 'cold snap', 'severe', -8.0, 25.0, '2025-01-18 00:00:00', 0.86),
      ('Florida Peninsula', 'tropical storm', 'high', -28.0, -8.0, '2025-09-05 00:00:00', 0.72),
      ('Midwest', 'ice storm', 'severe', -18.0, 22.0, '2025-02-10 00:00:00', 0.82),
      ('Desert Southwest', 'clear skies', 'low', 12.0, 8.0, '2025-07-20 00:00:00', 0.96),
      ('Rocky Mountains', 'snowstorm', 'high', -15.0, 20.0, '2025-12-05 00:00:00', 0.80),
      ('Central Valley, CA', 'fog', 'low', -10.0, 2.0, '2025-11-15 00:00:00', 0.89),
      ('Southeastern US', 'thunderstorm', 'moderate', -12.0, 5.0, '2025-07-25 00:00:00', 0.85),
      ('Northern Plains', 'blizzard', 'extreme', -40.0, 30.0, '2025-01-28 00:00:00', 0.75),
      ('Appalachian Region', 'heavy rain', 'moderate', -8.0, 3.0, '2025-04-10 00:00:00', 0.87),
      ('Southern Plains', 'drought', 'high', 5.0, 15.0, '2025-08-01 00:00:00', 0.90),
      ('Great Lakes Region', 'lake-effect snow', 'moderate', -10.0, 18.0, '2025-11-20 00:00:00', 0.83),
      ('Mid-Atlantic', 'nor-easter', 'severe', -25.0, 28.0, '2025-03-12 00:00:00', 0.79);
    `);
    console.log('  -> Seeded 16 weather_impact');

    // ─── 13. maintenance_schedule ───
    console.log('Creating maintenance_schedule table...');
    await client.query(`
      CREATE TABLE maintenance_schedule (
        id SERIAL PRIMARY KEY,
        asset_name VARCHAR(100),
        asset_type VARCHAR(50),
        last_maintenance TIMESTAMP,
        next_maintenance TIMESTAMP,
        priority VARCHAR(50),
        status VARCHAR(50),
        predicted_failure_risk DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO maintenance_schedule (asset_name, asset_type, last_maintenance, next_maintenance, priority, status, predicted_failure_risk) VALUES
      ('Transformer T-401, Houston', 'transformer', '2025-01-15 08:00:00', '2025-07-15 08:00:00', 'critical', 'overdue', 0.78),
      ('Generator G-12, Phoenix', 'generator', '2025-03-20 09:00:00', '2025-09-20 09:00:00', 'high', 'scheduled', 0.45),
      ('Circuit Breaker CB-88, Chicago', 'circuit-breaker', '2025-05-10 10:00:00', '2025-11-10 10:00:00', 'medium', 'scheduled', 0.22),
      ('Transmission Tower TT-205, Denver', 'tower', '2024-11-01 07:00:00', '2025-05-01 07:00:00', 'critical', 'overdue', 0.85),
      ('Capacitor Bank CAP-15, Atlanta', 'capacitor-bank', '2025-06-01 08:00:00', '2025-12-01 08:00:00', 'low', 'scheduled', 0.12),
      ('Substation Relay SR-33, Seattle', 'relay', '2025-04-15 09:00:00', '2025-10-15 09:00:00', 'medium', 'scheduled', 0.30),
      ('Power Cable PC-770, Boston', 'cable', '2025-02-28 10:00:00', '2025-08-28 10:00:00', 'high', 'in-progress', 0.55),
      ('Cooling System CS-5, Dallas', 'cooling-system', '2025-05-20 07:00:00', '2025-11-20 07:00:00', 'medium', 'scheduled', 0.28),
      ('Switchgear SG-19, Miami', 'switchgear', '2024-12-10 08:00:00', '2025-06-10 08:00:00', 'critical', 'overdue', 0.82),
      ('Battery Bank BB-7, San Jose', 'battery-bank', '2025-06-15 09:00:00', '2025-12-15 09:00:00', 'low', 'scheduled', 0.10),
      ('Turbine TB-3, Portland', 'turbine', '2025-03-01 10:00:00', '2025-09-01 10:00:00', 'high', 'scheduled', 0.48),
      ('Disconnect Switch DS-42, Nashville', 'switch', '2025-04-20 07:00:00', '2025-10-20 07:00:00', 'medium', 'scheduled', 0.25),
      ('Lightning Arrester LA-61, Orlando', 'arrester', '2025-01-05 08:00:00', '2025-07-05 08:00:00', 'high', 'overdue', 0.62),
      ('Bus Bar BB-14, Detroit', 'bus-bar', '2025-05-30 09:00:00', '2025-11-30 09:00:00', 'low', 'scheduled', 0.15),
      ('SCADA Terminal ST-8, Charlotte', 'scada', '2025-06-20 10:00:00', '2025-12-20 10:00:00', 'medium', 'scheduled', 0.20),
      ('Voltage Regulator VR-27, Minneapolis', 'regulator', '2024-10-15 07:00:00', '2025-04-15 07:00:00', 'critical', 'overdue', 0.90);
    `);
    console.log('  -> Seeded 16 maintenance_schedule');

    // ─── 14. regulatory_compliance ───
    console.log('Creating regulatory_compliance table...');
    await client.query(`
      CREATE TABLE regulatory_compliance (
        id SERIAL PRIMARY KEY,
        regulation_name VARCHAR(100),
        authority VARCHAR(100),
        compliance_status VARCHAR(50),
        deadline TIMESTAMP,
        penalty_risk DECIMAL,
        last_audit TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO regulatory_compliance (regulation_name, authority, compliance_status, deadline, penalty_risk, last_audit, notes) VALUES
      ('NERC CIP-002 BES Cyber Assets', 'NERC', 'compliant', '2025-12-31 00:00:00', 0.05, '2025-06-15 00:00:00', 'All critical cyber assets identified and documented'),
      ('NERC CIP-005 Electronic Security', 'NERC', 'compliant', '2025-12-31 00:00:00', 0.08, '2025-05-20 00:00:00', 'Electronic security perimeters verified'),
      ('EPA Clean Air Act Section 111', 'EPA', 'partial', '2025-09-30 00:00:00', 0.35, '2025-04-10 00:00:00', 'Two coal units pending emission upgrades'),
      ('FERC Order 2222 DER Participation', 'FERC', 'in-progress', '2025-11-15 00:00:00', 0.20, '2025-03-25 00:00:00', 'DER aggregation platform under development'),
      ('DOE Grid Resilience Standards', 'DOE', 'compliant', '2026-03-31 00:00:00', 0.10, '2025-06-01 00:00:00', 'Resilience metrics meet federal requirements'),
      ('OSHA Electrical Safety 1910.269', 'OSHA', 'compliant', '2025-12-31 00:00:00', 0.12, '2025-07-01 00:00:00', 'Annual safety training completed for all crews'),
      ('NERC FAC-008 Facility Ratings', 'NERC', 'non-compliant', '2025-08-15 00:00:00', 0.55, '2025-02-28 00:00:00', 'Three transmission lines require rating updates'),
      ('State RPS 40% Renewable by 2030', 'State PUC', 'on-track', '2030-01-01 00:00:00', 0.15, '2025-05-15 00:00:00', 'Currently at 32% renewable generation'),
      ('NERC PRC-005 Protection Systems', 'NERC', 'compliant', '2025-12-31 00:00:00', 0.07, '2025-06-20 00:00:00', 'All protection systems tested within intervals'),
      ('EPA RCRA Hazardous Waste', 'EPA', 'compliant', '2025-12-31 00:00:00', 0.09, '2025-04-05 00:00:00', 'Waste manifests current, storage areas inspected'),
      ('FERC Order 881 Ambient Ratings', 'FERC', 'in-progress', '2025-10-01 00:00:00', 0.30, '2025-03-10 00:00:00', 'Ambient-adjusted ratings for 60% of lines implemented'),
      ('NERC TPL-001 Transmission Planning', 'NERC', 'compliant', '2025-12-31 00:00:00', 0.06, '2025-05-30 00:00:00', 'Transmission planning studies completed'),
      ('State Carbon Cap Regulation', 'State DEQ', 'partial', '2025-12-31 00:00:00', 0.40, '2025-04-22 00:00:00', 'Emissions 8% above quarterly cap target'),
      ('NERC MOD-025 Generator Verification', 'NERC', 'compliant', '2025-12-31 00:00:00', 0.04, '2025-06-10 00:00:00', 'All generator reactive capability verified'),
      ('IEEE 1547 DER Interconnection', 'IEEE', 'compliant', '2026-06-30 00:00:00', 0.11, '2025-05-05 00:00:00', 'New DER interconnections meet updated standard'),
      ('NERC EOP-011 Emergency Operations', 'NERC', 'non-compliant', '2025-08-31 00:00:00', 0.48, '2025-01-20 00:00:00', 'Emergency load shedding plan requires revision');
    `);
    console.log('  -> Seeded 16 regulatory_compliance');

    // ─── 15. grid_topology ───
    console.log('Creating grid_topology table...');
    await client.query(`
      CREATE TABLE grid_topology (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(50),
        node_type VARCHAR(50),
        capacity_mw DECIMAL,
        connected_nodes TEXT,
        location VARCHAR(100),
        status VARCHAR(50),
        voltage_level DECIMAL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO grid_topology (node_id, node_type, capacity_mw, connected_nodes, location, status, voltage_level) VALUES
      ('SUB-001', 'substation', 2500, 'SUB-002,TRF-001,GEN-001', 'Houston, TX', 'online', 345),
      ('SUB-002', 'substation', 1800, 'SUB-001,SUB-003,TRF-002', 'Dallas, TX', 'online', 345),
      ('SUB-003', 'substation', 2200, 'SUB-002,JCT-001,GEN-002', 'Phoenix, AZ', 'online', 500),
      ('SUB-004', 'substation', 3000, 'TRF-003,GEN-003,JCT-002', 'Chicago, IL', 'online', 345),
      ('TRF-001', 'transformer', 500, 'SUB-001,JCT-003', 'Katy, TX', 'online', 138),
      ('TRF-002', 'transformer', 750, 'SUB-002,JCT-004', 'Fort Worth, TX', 'online', 138),
      ('TRF-003', 'transformer', 600, 'SUB-004,JCT-005', 'Naperville, IL', 'online', 138),
      ('TRF-004', 'transformer', 450, 'SUB-003,JCT-006', 'Tempe, AZ', 'maintenance', 69),
      ('JCT-001', 'junction', 1200, 'SUB-003,GEN-004,TRF-004', 'Tucson, AZ', 'online', 230),
      ('JCT-002', 'junction', 900, 'SUB-004,TRF-003,GEN-003', 'Gary, IN', 'online', 230),
      ('JCT-003', 'junction', 400, 'TRF-001,SUB-001', 'Sugar Land, TX', 'online', 69),
      ('JCT-004', 'junction', 550, 'TRF-002,SUB-002', 'Arlington, TX', 'degraded', 69),
      ('GEN-001', 'generator', 1400, 'SUB-001', 'Bay City, TX', 'online', 24),
      ('GEN-002', 'generator', 3937, 'SUB-003', 'Tonopah, AZ', 'online', 24),
      ('GEN-003', 'generator', 2400, 'SUB-004,JCT-002', 'Morris, IL', 'online', 22),
      ('GEN-004', 'generator', 800, 'JCT-001', 'Gila Bend, AZ', 'offline', 13.8);
    `);
    console.log('  -> Seeded 16 grid_topology');

    console.log('\nDatabase seed completed successfully!');
    console.log('  Users: 1 (admin@energygrid.com)');
    console.log('  Tables seeded: 15');
    console.log('  Records per table: 16');
    console.log('  Total records: 241');

  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

seed();
