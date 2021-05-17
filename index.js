const http = require("http");
const MongoClient = require("mongodb").MongoClient;
const port = 8080;
const mongoClient = new MongoClient("mongodb://localhost:27017/", { useUnifiedTopology: true });

http.createServer(async function(req, res){
    if(req.method == "POST"){
        let body='';
        req.on('data', data => {
            body += data;
        });
        req.on('end',() => {
            try{
                body = JSON.parse(body)
                /*body опишем как 
                {
                    type: "set"/"get_one"/"get_all" //Установить рекорд/получить рекорд юзера/получить все рекорды
                    data: data //Основной запрос {user_id,username,time} id - mac address or smth like this
                }
                {
                "type": "get_one",
                "data": {"user_id":"","username":"aboba","time":"1:2:3"}
                }
                 */
            }catch (err){
                console.log("json parse error")
                return;
            }

            let obj_data = body.data
            obj_data.user_id = req.socket.localAddress; //Пусть будет ip

            console.log("Got new post request...");
            res.writeHead(200, {'Content-Type': `application/json`});

            mongoClient.connect(async function(err, client){
                const collection = client.db("KeyboardClicker").collection("scoreboard");
                if(body.type == "get_one"){
                    await collection.findOne({user_id: obj_data.user_id},async function(err,result){
                        if(err){ 
                            return console.log(err);
                        }
                        if(result){
                            console.log(JSON.stringify(result))
                            res.write(`Name: ${result.username} Time: ${result.time}`);
                            res.end();
                        }
                    })
                }else if(body.type == "get_all"){
                    var result = await collection.find({},{_id:1})
                    .toArray();
                    if(result){
                        let str = ""
                        result.forEach((elem)=>{
                            str += `Name: ${result.username} Time: ${result.time} \n`
                        })
                        res.write(str);
                        res.end();
                    }
                }else if(body.type == "set"){
                    await collection.findOne({user_id: obj_data.user_id},async function(err,res){
                        if(err){ 
                            return console.log(err);
                        }
                        if(!res){
                            collection.insertOne(obj_data, (err, res)=>{
                                if(err){ 
                                    return console.log(err);
                                }
                                console.log('new user added by id');
                            });
                        }else{
                            collection.updateOne({user_id: obj_data.user_id},{$set: {time: obj_data.time, username: obj_data.username}}, (err, res)=>{
                                if(err){ 
                                    return console.log(err);
                                }
                                console.log('user updated by id');
                            });
                        }
                    })
                    res.end();
                }
            });
        });
    }
}).listen(port,()=>{
    console.log('http://127.0.0.1'+':'+port);
});