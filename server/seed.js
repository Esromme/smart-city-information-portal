/**
 * Seeds demo content for the Kombolcha Smart City portal.
 *
 * Usage:
 *   npm run seed            # inserts only when the tables are empty
 *   npm run seed -- --reset # clears the three tables and inserts again
 *
 * The place names, hours and coordinates are illustrative sample data.
 */
import { pool } from './db.js';

const reset = process.argv.includes('--reset');

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

const announcements = [
  {
    title: 'Scheduled water maintenance in central Kombolcha',
    category: 'utilities',
    content:
      'The water supply office will repair a main line on the central distribution network this Saturday from 8:00 AM to 4:00 PM. Residents in the city centre, Bella and Kera areas may experience low pressure or a temporary interruption. Please store water in advance. Emergency tankers will be stationed near the main market.',
    published_at: hoursAgo(3),
  },
  {
    title: 'Free health screening campaign at Kombolcha General Hospital',
    category: 'health',
    content:
      'A free screening campaign for blood pressure, diabetes and vision will run from Monday to Friday, 8:30 AM to 3:00 PM. Bring your health card if you have one. No appointment is needed. The campaign is open to all residents of Kombolcha and surrounding kebeles.',
    published_at: hoursAgo(26),
  },
  {
    title: 'Road resurfacing on the Dessie road corridor',
    category: 'transport',
    content:
      'Road works on the Dessie road corridor will continue for the next two weeks. One lane will remain open in each direction and traffic officers will be on site during peak hours. Drivers are advised to use the ring road for heavy vehicles and to allow extra travel time.',
    published_at: hoursAgo(52),
  },
  {
    title: 'City-wide cleaning day this Sunday',
    category: 'community',
    content:
      'All kebeles are invited to join the monthly city cleaning day this Sunday starting at 7:00 AM. Collection points will be announced by kebele leaders. Please separate plastic, metal and organic waste where possible. Gloves and bags will be provided at each collection point.',
    published_at: hoursAgo(80),
  },
  {
    title: 'Enrollment open for evening skills training',
    category: 'education',
    content:
      'The Kombolcha TVET centre has opened enrollment for evening courses in electrical installation, tailoring, computer basics and small business management. Classes begin next month and run three evenings per week. Visit the registrar office with an ID copy to register.',
    published_at: hoursAgo(120),
  },
  {
    title: 'Traffic safety awareness week',
    category: 'safety',
    content:
      'The traffic police and city administration will run a road safety awareness week focusing on pedestrian crossings, helmet use and safe minibus boarding. Officers will visit schools and the main bus station. Drivers are reminded that seat belts are mandatory on all roads.',
    published_at: hoursAgo(168),
  },
];

const services = [
  {
    name: 'Kombolcha General Hospital',
    category: 'health',
    description:
      'Referral hospital with emergency, maternity, pediatrics and outpatient departments. Laboratory and pharmacy services available around the clock.',
    location: 'Hospital Road, Kombolcha',
  },
  {
    name: 'Kombolcha Health Centre',
    category: 'health',
    description:
      'Primary health care, maternal and child health, immunization and family planning services.',
    location: 'Bella, Kombolcha',
  },
  {
    name: 'Kombolcha City Administration',
    category: 'government',
    description:
      'Municipal offices for civil registration, land administration, business licensing and building permits.',
    location: 'City Hall, central Kombolcha',
  },
  {
    name: 'Kombolcha Police Station',
    category: 'emergency',
    description:
      'Community policing, incident reporting and traffic accident response. Emergency line available 24 hours.',
    location: 'Main Road, Kombolcha',
  },
  {
    name: 'Kombolcha Fire and Rescue',
    category: 'emergency',
    description:
      'Firefighting, rescue and first response for accidents and hazardous material incidents.',
    location: 'Dessie Road, Kombolcha',
  },
  {
    name: 'Kombolcha Water Supply Office',
    category: 'utilities',
    description:
      'New connections, meter readings, leak reporting and water quality complaints.',
    location: 'Kera, Kombolcha',
  },
  {
    name: 'Kombolcha Electric Utility Office',
    category: 'utilities',
    description:
      'Power connections, prepaid meter services, outage reporting and street lighting requests.',
    location: 'Central Kombolcha',
  },
  {
    name: 'Kombolcha Public Library',
    category: 'education',
    description:
      'Reading rooms, reference collection, study space and a children’s section. Free membership for students.',
    location: 'Near the main square, Kombolcha',
  },
  {
    name: 'Kombolcha TVET College',
    category: 'education',
    description:
      'Technical and vocational training in electrical, mechanical, construction, ICT and business fields.',
    location: 'Bella, Kombolcha',
  },
  {
    name: 'Kombolcha Bus Station',
    category: 'transport',
    description:
      'Intercity and regional bus terminal serving Dessie, Addis Ababa, Woldia and nearby towns.',
    location: 'Dessie Road, Kombolcha',
  },
  {
    name: 'Kombolcha Post Office',
    category: 'government',
    description:
      'Postal services, parcels, PO boxes and money transfer counter.',
    location: 'Main Road, Kombolcha',
  },
  {
    name: 'Kombolcha Community Market',
    category: 'community',
    description:
      'Daily market for fresh produce, grains, livestock supplies and household goods. Expanded market days on Saturdays.',
    location: 'Central market area, Kombolcha',
  },
];

const locations = [
  { name: 'Kombolcha General Hospital', category: 'health', latitude: 11.0868, longitude: 39.7331 },
  { name: 'Kombolcha Health Centre', category: 'health', latitude: 11.0762, longitude: 39.7459 },
  { name: 'Kombolcha City Administration', category: 'government', latitude: 11.0847, longitude: 39.7396 },
  { name: 'Kombolcha Police Station', category: 'emergency', latitude: 11.0885, longitude: 39.7409 },
  { name: 'Kombolcha Fire and Rescue', category: 'emergency', latitude: 11.0906, longitude: 39.7285 },
  { name: 'Kombolcha Water Supply Office', category: 'utilities', latitude: 11.0802, longitude: 39.7367 },
  { name: 'Kombolcha Electric Utility Office', category: 'utilities', latitude: 11.0861, longitude: 39.7418 },
  { name: 'Kombolcha Public Library', category: 'education', latitude: 11.0833, longitude: 39.7375 },
  { name: 'Kombolcha TVET College', category: 'education', latitude: 11.0738, longitude: 39.7301 },
  { name: 'Kombolcha Bus Station', category: 'transport', latitude: 11.0925, longitude: 39.7442 },
  { name: 'Kombolcha Post Office', category: 'government', latitude: 11.0856, longitude: 39.7383 },
  { name: 'Kombolcha Community Market', category: 'community', latitude: 11.0814, longitude: 39.7426 },
];

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const existing = await client.query(`
      select
        (select count(*) from public.announcements)::int as announcements,
        (select count(*) from public.services)::int as services,
        (select count(*) from public.service_locations)::int as locations
    `);
    const counts = existing.rows[0];
    const hasData = counts.announcements + counts.services + counts.locations > 0;

    if (hasData && !reset) {
      console.log('[seed] Tables already contain data. Use "npm run seed -- --reset" to replace it.');
      await client.query('rollback');
      return;
    }

    if (hasData) {
      await client.query(
        'truncate public.announcements, public.services, public.service_locations restart identity'
      );
      console.log('[seed] Cleared existing rows.');
    }

    for (const item of announcements) {
      await client.query(
        `insert into public.announcements (title, content, category, published_at)
         values ($1, $2, $3, $4)`,
        [item.title, item.content, item.category, item.published_at]
      );
    }

    for (const item of services) {
      await client.query(
        `insert into public.services (name, category, description, location)
         values ($1, $2, $3, $4)`,
        [item.name, item.category, item.description, item.location]
      );
    }

    for (const item of locations) {
      await client.query(
        `insert into public.service_locations (name, category, latitude, longitude)
         values ($1, $2, $3, $4)`,
        [item.name, item.category, item.latitude, item.longitude]
      );
    }

    await client.query('commit');
    console.log(
      `[seed] Inserted ${announcements.length} announcements, ${services.length} services and ${locations.length} locations.`
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('[seed] Failed:', error.message);
  process.exitCode = 1;
});
