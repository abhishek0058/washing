const express = require('express');
const router = express.Router();
const pool = require('./pool');
const utils = require('./utils');
const { celebrate, Joi } = require('celebrate');

const tableName = 'hostel'

router.get('/', (req,res) => {
    res.render('hostel/hostel')
})

router.post('/new', (req, res) => {
    const query = `insert into ${tableName} set ? `
    pool.query(query, req.body, err => {
        if(err) {
            console.log(err)
            res.json({ result: false })
        } else {
            res.json({ result: true })
        }
    })
})

router.get('/all', (req, res) => {
    const query = `select h.*, c.name as cityname from hostel h inner join city c on c.id = h.cityid`;
    pool.query(query, (err, result) => {
        if(err) {
            console.log(err)
            res.json({ result: false });
        } else {
            res.json({ result });
        }
    })
})

router.get('/single/:id', (req, res) => {
    const { id } = req.params;
    pool.query(`select *, (select name from city where id = ${tableName}.cityid) as cityname from ${tableName} where id = ?`, [id], (err, result) => {
        if(err) {
            console.log(err)
            res.json({ result: false })
        } else {
            res.json({ result })
        }
    })
})

router.post(`/edit`, (req, res) => {
    const { id } = req.body
    const query = `update ${tableName} set ? where id = ? `
    pool.query(query, [req.body, id], err => {
        if(err) {
            console.log(err)
            res.json({ result: false })
        } else {
            res.json({ result: true })
        }
    })
})

router.get('/delete/:id', (req, res) => {
    const { id } = req.params;
    pool.query(`delete from ${tableName} where id = ?`, [id], (err, result) => {
        if(err) {
            console.log(err)
            res.json({ result: false })
        } else {
            res.json({ result: true })
        }
    })
});

router.get('/users/:hostelid', (req, res) => {
    const { hostelid } = req.params;
    const query = `select U.*,A.* from user U, account A where hostelid = ${hostelid} and U.id=A.userid`;
    pool.query(query, (err, result) => {
        if(err) {
            console.log(err)
            res.json({ result: [] })
        } else {
            res.json({ result });
        }
    });
})

router.get('/by-city/:cityid', (req, res) => {
    const { cityid } = req.params;
    const query = `select * from ${tableName} where cityid = ?`;
    pool.query(query, [cityid], (err, result) => {
        if(err) {
            console.log(err)
            res.json({ result: false })
        } else {
            res.json({ result });
        }
    });
});

router.get('/change-free-cycle/:id/:status', (req, res) => {
    const { id, status } = req.params;
    const _status = status == 'true' ? 'false' : 'true';
    const change_free_cycle = `update hostel set free_cycle = ? where id = ?`;
    pool.query(change_free_cycle, [_status, id], (err, result) => {
        if(err) {
            return res.json({ result: false });
        }
        res.json({ result: true });
    })
});

router.get('/usersList/:hostelId', celebrate({
    params: {
        hostelId: Joi.number().integer().required()
    }
}), async (req, res) => { 
    const { hostelId } = req.params;
    const query = `select id, name, mobile, email from user where hostelid = ?`;
    const users = await utils.executeQuery(query, [hostelId]);
    return res.json({ users }); 
});

module.exports = router;
