const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
app.use(express.json())
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}

const Authenticate = (req, res, next) => {
  let jwtToke
  const authHeader = req.headers['authorization']
  if (authHeader !== undefined) {
    jwtToke = authHeader.split(' ')[1]
  }
  if (jwtToke === undefined) {
    res.status(401)
    res.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToke, 'HAMBAHAMBADAMBADAMBA', async (error, payload) => {
      if (error) {
        res.status(401).send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

initializeDBandServer()
app.post('/login/', async (req, res) => {
  const {username, password} = req.body
  let query = `SELECT * FROM user WHERE username='${username}';`
  const user = await db.get(query)
  if (user === undefined) {
    res.status(400).send('Invalid user')
  } else {
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      res.status(400).send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'HAMBAHAMBADAMBADAMBA')
      res.send({jwtToken})
    }
  }
})

app.get('/states/', Authenticate, async (req, res) => {
  let query = `SELECT * FROM state;`
  const resDB = await db.all(query)
  res.send(
    resDB.map(each => {
      return {
        stateId: each.state_id,
        stateName: each.state_name,
        population: each.population,
      }
    }),
  )
})

app.get('/states/:stateId/', Authenticate, async (req, res) => {
  const {stateId} = req.params
  let query = `SELECT state_id as stateId,state_name as stateName,population FROM state WHERE state_id = ${stateId};`
  const ress = await db.get(query)
  res.send(ress)
})

app.post('/districts/', Authenticate, async (req, res) => {
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  let query = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`
  const resss = await db.run(query)
  res.send('District Successfully Added')
})

app.get('/districts/:districtId/', Authenticate, async (req, res) => {
  const {districtId} = req.params
  let query = `SELECT district_id as districtId,
  district_name as districtName,
  state_id as stateId,
  cases,cured,active,deaths
  FROM district WHERE district_id=${districtId};`
  const resss = await db.get(query)
  res.send(resss)
})

app.delete('/districts/:districtId/', Authenticate, async (req, res) => {
  const {districtId} = req.params
  let query = `DELETE FROM district WHERE district_id = ${districtId};`
  await db.run(query)
  res.send('District Removed')
})

app.put('/districts/:districtId/', Authenticate, async (req, res) => {
  const {districtId} = req.params
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  let query = `UPDATE district SET 
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  WHERE district_id=${districtId};
  `
  await db.run(query)
  res.send('District Details Updated')
})

app.get('/states/:stateId/stats/', Authenticate, async (req, res) => {
  const {stateId} = req.params
  let query = `SELECT SUM(cases) as totalCases,SUM(cured) as totalCured,SUM(active) as totalActive,SUM(deaths) as totalDeaths FROM district WHERE state_id=${stateId};`
  const responseDB = await db.get(query)
  res.send(responseDB)
})

module.exports = app
