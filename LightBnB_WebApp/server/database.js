const { Pool } = require('pg');

const pool = new Pool({
  user: 'akatyal',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

const properties = require('./json/properties.json');
const users = require('./json/users.json');

// ----------- Users -----------

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(
      `SELECT * FROM users 
     WHERE email = $1`
      , [email.toLowerCase()])
    .then((result) => {
      if (result.rows[0]) {
        console.log(result.rows[0]);
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(
      `SELECT * FROM users 
     WHERE id = $1`
      , [id])
    .then((result) => {
      if (result.rows[0]) {
        return result.rows[0];
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool
    .query(`
    INSERT INTO users(name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;`
      , [user.name, user.email, user.password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;


// ----------- Reservations -----------

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 2000) {
  limit = 2000;
  return pool
    .query(`
    SELECT reservations.*, properties.*, AVG(rating) AS average_rating
    FROM reservations
    JOIN properties ON properties.id = property_id
    JOIN property_reviews ON property_reviews.property_id = properties.id
    WHERE (now()::date) > end_date AND reservations.guest_id = $1
    GROUP BY reservations.id, properties.id
    ORDER BY start_date
    LIMIT $2;
    `, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllReservations = getAllReservations;


// ----------- Properties -----------

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {

  let clause = "WHERE";

  // 1
  const queryParams = [];
  // 2
  let queryString = `
   SELECT properties.*, avg(property_reviews.rating) as average_rating
   FROM properties
   LEFT JOIN property_reviews ON properties.id = property_id
   `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `${clause} city LIKE $${queryParams.length}`;
    clause = "AND";
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += `${clause} owner_id = $${queryParams.length}`;
    clause = "AND";
  }

  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    queryString += `${clause} cost_per_night >= $${queryParams.length}`;
    clause = "AND";
  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    queryString += `${clause} cost_per_night <= $${queryParams.length}`;
    clause = "AND";
  }

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `${clause} property_reviews.rating >= $${queryParams.length}`;
    clause = "AND";
  }
  //4
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);
  
  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
};

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (properties) {
  const queryString = `INSERT INTO properties 
  (owner_id,
  title,
  description,
  thumbnail_photo_url,
  cover_photo_url,
  cost_per_night,
  street,
  city,
  province,
  post_code,
  country,
  parking_spaces,
  number_of_bathrooms,
  number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING * ;`;

  const queryParams = [
    properties.owner_id,
    properties.title,
    properties.description,
    properties.thumbnail_photo_url,
    properties.cover_photo_url,
    properties.cost_per_night,
    properties.street,
    properties.city,
    properties.province,
    properties.post_code,
    properties.country,
    properties.parking_spaces,
    properties.number_of_bathrooms,
    properties.number_of_bedrooms
  ];

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });

};

exports.addProperty = addProperty;
