const express = require('express');
const router = express.Router();
const pool = require('./pool');
const email = require('./email');
const tableName = 'user'
const request = require('request');

router.post('/login', (req, res) => {
    const {
        username,
        password
    } = req.body;
    const query = `select * from ${tableName} where (email = ? or mobile = ?) and password = ? `
    pool.query(query, [username, username, password], (err, result) => {
        if (err) {
            console.log(err);
            res.json([]);
        } else {
            res.json(result)
        }
    })
})

router.post('/new', (req, res) => {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000);
        const {
            name,
            email,
            mobile,
            password
        } = req.body;
        
        const checkIfAlreadyExist = "select * from user, pending_users where user.mobile = ? or pending_users.mobile = ?";
        pool.query(checkIfAlreadyExist, [mobile, mobile], (err, checkIfAlreadyExistReuslt) => {
            console.log("check If mobile Already Exist Reuslt -> ", checkIfAlreadyExistReuslt);
            if(err) {
                console.log("error", err)
                return res.json({ result: false, message: "Mobile Number Already Exist" })
            } else if(checkIfAlreadyExistReuslt.length == 0) {
                const query = `insert into pending_users (name, email, mobile, password, otp) values('${name}', '${email}', '${mobile}', '${password}', '${otp}')`;
                console.log("query", query)
                pool.query(query, (err, result) => {
                    if (err) {
                        console.log("error during insterting pending user", err);
                        return res.json({
                            result: false
                        });
                    }
                    SendOtp(mobile, otp, res);
                })
            }
        })

    } catch (e) {
        console.log("/user/new", e);
        res.json({
            result: false
        });
    }
})

router.post('/verify_otp', (req, res) => {
    try {
        console.log("verfity Otp -> ", req.body);
        const {
            mobile,
            otp
        } = req.body
        pool.query(`select * from pending_users where mobile = ? and otp = ?`, [mobile, otp], (err, result) => {
            if (err) {
                return res.json({
                    status: false,
                    message: "Invalid Otp / Mobile Number"
                })
            } else if (result.length) {
                const {
                    name,
                    email,
                    mobile,
                    password
                } = result[0];
                console.log("from pending user -> ", result);
                // move user from pending_users to users
                const query = `delete from pending_users where mobile = '${mobile}';insert into user (name, email, mobile, password) values('${name}', '${email}', '${mobile}', '${password}');`;
                const addFreeCycle = `insert into account (userid, packageid, cycles_left) VALUES (?, 16, 1);`;
                const queryHistory = `insert into purchase_history(userid, packageid, amount, date) values(?, 16, 0, CURDATE());`;
                console.log("query", query);
                // console.log("addFreeCycle", addFreeCycle);
                pool.query(query, (err2, result2) => {
                    if (err) {
                        return res.json({
                            result: false,
                            message: "internal error occurred, please "
                        })
                    } else {
                        pool.query(addFreeCycle + queryHistory, [result2[1].insertId, result2[1].insertId], (addError, addreuslt) => {
                            if(addError) {
                                console.log("add Error", addError);
                            } else {
                                console.log("free cycle added result -> ", addreuslt);
                            }
                        })
                        
                        console.log("user confirmed", { ...result[0], id: result2[1] .insertId })

                        return res.json({
                            result: true,
                            message: "OTP is verfified",
                            data: { ...result[0],
                                id: result2[1].insertId
                            }
                        })
                    }
                })
            }
            else {
                return res.json({ result: false, message: "Mobile number not found" })
            }
        })
    } catch (e) {
        console.log('error in otp', e);
        res.json({
            status: failed,
            message: "Internal error occurred"
        });
    }
})

router.post('/forget_password', (req, res) => {
    console.log("forget_password -> ", req.body);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const { mobile } = req.body;
    const query = "select * from user where mobile = ?";
    try {
        pool.query(query, [req.body.mobile], (err, result) => {
            if(err) {
                console.log("error in /forget_password ->", err);
                return res.json({ result: false });
            }
            else if(result[0] && result[0].mobile) {
                const update_mobile_security_key = `update user set mobile_security_key = ? where mobile = ?`;
                pool.query(update_mobile_security_key, [otp, mobile], (err, result) => {
                    if(err) {
                        console.log("update_mobile_security_key -> error", err);
                        return res.json({result: false, message: "Internal Server Error"})
                    }
                    else {
                        SendOtp(mobile, otp, res);
                    }
                })
            }
            else {
                return res.json({ result: false, message: "Mobile number not found" })
            }
        })
    } catch(e) {
        console.log("error in /forget_password -> ", e);
        return res.json({ result: false });
    }
    pool.query(query, [req.body.mobile], (err, result) => {

    })
})

router.post('/change_password', (req, res) => {
    const { otp, mobile, password } = req.body;
    console.log("change_password -> ", req.body);

    const fetchUserRecord = `select * from user where mobile = ?`;

    pool.query(fetchUserRecord, [mobile], (err, result) => {
        if(err) {
            console.log("change_password error -> ", err);
            return res.json({ result: false, message: "Internal Server Error" })
        }
        else if(!result[0]) {
            console.log("change_password no record found");
            return res.json({ result: false, message: "Mobile Number not found" })
        }
        else if(result[0].mobile_security_key != otp) {
            console.log("change_password otp invalid", otp, result[0].mobile_security_key);
            return res.json({ result: false, message: "OTP is invalid" })
        }
        else if(result[0].mobile_security_key == otp) {
            const change_password = "update user set password = ? where mobile = ?";
            pool.query(change_password, [password, mobile], (err, result) => {
                if(err) {
                    console.log("change_password error -> ", err);
                    return res.json({ result: false, message: "Internal Server Error" })
                }
                else {
                    console.log("change_password -> success", result[0]);
                    return res.json({ result: true })
                }
            })
        }
    })

})

// req.post('/verify_otp', (req, res) => {
//     try {
//         console.log("verfity Otp -> ", req.body);
//         const { mobile, otp } = req.body
//         pool.query(`select * from pending_users where mobile = ?`, [mobile], (err, result) => {
//             const { name, email, mobile, password } = result[0];
//             if(err) {
//                 return res.json({ status: false, message: "mobile number not found" })
//             }
//             else if(result[0].otp == otp) {
//                 // move user from pending_users to users
//                 const query = `insert into ${tableName} (name, email, mobile, password) ('${name}', '${email}', '${mobile}', '${password}')`;
//                 pool.query("")
//             }
//         })
//     } catch(e) {
//         console.log('error in otp', e);
//         res.json({ status: failed, message: "Internal error occurred" });
//     }

// })

router.post(`/edit`, (req, res) => {
    const {
        id
    } = req.body
    const query = `update ${tableName} set ? where id = ? `;
    pool.query(query, [req.body, id], (err) => {
        if (err) {
            console.log(err)
            res.json({
                result: false
            })
        } else {
            res.json({
                result: true
            })
        }
    })
})

router.get('/single/:id', (req, res) => {
    const {
        id
    } = req.params;
    pool.query(`select * from ${tableName} where id = ?`, [id], (err, result) => {
        if (err) {
            console.log(err)
            res.json({
                result: false
            })
        } else {
            res.json({
                result
            })
        }
    })
})

router.get('/DisplayAll', (req, res) => {
    if (req.session.id)
        res.render('user/DisplayAll')
    else
        res.redirect('/admin');
});

router.get('/DisplayAllJSON', (req, res) => {
    if (req.session.id) {
        pool.query(`select U.*,A.* from ${tableName} U, account A WHERE U.id=A.userid`, (err, result) => {
            if (err) {
                console.log(err)
                res.json({
                    result: false
                })
            } else {
                res.json({
                    result
                })
            }
        })
    } else {
        res.redirect('/admin')
    }
});

router.get('/all', (req, res) => {
    pool.query(`select * from ${tableName}`, (err, result) => {
        if (err) {
            console.log(err)
            res.json({
                result: false
            })
        } else {
            res.json({
                result
            })
        }
    })
})

router.get('/sendVerificationLink/:userid', async (req, res) => {
    const {
        userid
    } = req.params
    const key = Date.now();
    const query = `select id, email from user where id = ? ;update user set email_security_key = ? where id = ?;`
    pool.query(query, [parseInt(userid), key, parseInt(userid)], (err, result) => {
        if (err) {
            console.log(err);
            res.json({
                result: false
            })
        } else if (result[0].length > 0) {
            email(result[0][0], "email-verification", res, key);
        } else {
            console.log('result', result);
            res.json({
                result: false
            })
        }
    })
})

router.get('/verifyUserEmail/:id/:key', (req, res) => {
    const {
        id,
        key
    } = req.params
    const query = `update user set email_verified = "true" where id = ? and email_security_key = ?`
    pool.query(query, [id, key], (err, result) => {
        if (err) {
            console.log(err)
            res.json({
                result: false
            })
        } else if (result.affectedRows > 0)
            res.json({
                result: true
            })
        else
            res.json({
                result: false
            })
    })
})

router.get('/sendVerificationOTP/:userid', (req, res) => {
    res.send(false);
})

const SendOtp = (mobile, otp, response) => {
    try {
        var options = {
            method: 'GET',
            url: process.env.SMS_URL,
            qs: {
                loginid: process.env.SMS_LOGIN_ID,
                password: process.env.SMS_LOGIN_PASSWORD,
                msg: 'Your one-time password is ' + otp,
                send_to: mobile,
                senderId: process.env.SMS_SENDER_ID,
                routeId: process.env.SMS_ROUTE_ID,
                smsContentType: 'english',
            },
            headers: {
                'Cache-Control': 'no-cache'
            }
        };

        console.log("options", options)
        request(options, function (error, result, body) {
            if (error) {
                console.log("error", error);
                return response.json({
                    result: false,
                    message: "Internal server error"
                });
            } else {
                console.log("body", body);
                console.log("SMS SEND TO -> ", mobile, "otp", otp)
                return response.json({
                    result: true
                })
            }
        });

    } catch (e) {
        console.log("error", e);
        return false
    }
}

// SendOtp('7566513554', "123");

module.exports = router;