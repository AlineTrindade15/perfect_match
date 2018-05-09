//The Path module provides a way of working with directories and file paths.
var path 			= require("path"),
	express 		= require("express"),
	app				= express(),
	ejs     		= require("ejs"),
	bodyParser		= require("body-parser"),
	mongoose 		= require("mongoose"),
	passport		= require("passport"),
	LocalStrategy 	= require("passport-local"),
	flash			= require("connect-flash"),
	methodOverride  = require("method-override"),
	moment			= require("moment");

var User = require("./models/user");   //requiring models
var Message = require("./models/message");

mongoose.connect("mongodb://localhost/dating_app");

moment().format();
app.use(bodyParser.urlencoded({ extended: true }));  //to get data from body using req.body, from and POST //parse with qs library that allows to create nested objects (objetcs inside objects)
app.use(express.static(path.join(__dirname, 'public')));  //function join from path, join two different directories
app.use(methodOverride("_method"));
app.set("view engine","ejs");

//PASSPORT CONFIGURATION
//Passport's sole purpose is to authenticate requests, which it does through an extensible set of plugins known as strategies. 
//The API is simple: you provide Passport a request to authenticate, and Passport provides hooks for controlling what occurs when authentication succeeds or fails.
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false})); //Create a session middleware with the given options.
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));  //Passport strategy for authenticating with a username and password. (Login)
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(flash());

app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	res.locals.info = req.flash("info");
	next();
});



// ==================================================ROUTES=============================================== //

//landing route
app.get("/", function(req,res){
	res.render("landing");
});

//show all users and search route
app.get("/users", function(req,res){

	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');

		User.find({firstName: regex}, function(err, allUsersFound){
			if(err){
				req.flash("error", err);
			} else{
				res.render("users/index", {users: allUsersFound});
			}
		});
	} else{
		User.find({},function(err,allUsers){
			if(err){
				console.log(err);
			}else{
				res.render("users/index",{users: allUsers});
			}
		});
	}
}); 

//show user profile route
app.get("/users/:id", function(req,res){
	
	User.findById(req.params.id).populate("messages").exec(function(err,foundUser){ //populate user page with messages, otherwise it would only show the message's id
		if(err || !foundUser){
			req.flash("error","User not found");
			res.redirect("/users");
		}else{
			var newAge = getAge(foundUser.birth);
			foundUser.age = newAge;
			foundUser.save();

			res.render("users/show",{user: foundUser, age: newAge});
		}
		
	});
});

//edit user profile route
app.get("/users/:id/edit",function(req,res){	
	User.findById(req.params.id,function(err,foundUser){
		if(err || !foundUser){
			req.flash("error","User not found");
			res.redirect("/users");
		}
		res.render("users/edit",{user: foundUser});
	});
});

//update user profile route
app.put("/users/:id", function(req,res){
	User.findByIdAndUpdate(req.params.id, req.body.user, function(err, user){		

		if(err){
			console.log(err.message);
			req.flash("error",err.message);
			res.return("/user/:id");
		} else{
			req.flash("success","User profile updated");
			res.redirect("/users/" + user._id);
		}
	});
});

//new message route
app.get("/users/:id/messages/new", isLoggedIn ,function(req,res){
	User.findById(req.params.id, function(err,foundUser){
		if(err || !foundUser){
			req.flash("error","User not foud!");
			res.return("back");
		} else{
			res.render("messages/new",{user: foundUser});
		}
	});
});

//create message route and update user profile
app.post("/users/:id/messages/new",isLoggedIn,function(req,res){
	User.findById(req.params.id, function(err,user){
		if(err || !user){
			console.log(err);
			res.return("/user/:id");
		} else{
			Message.create(req.body.message, function(err,message){
				if(err){
					req.flash("error",err);
					res.return("/user/:id/new");
				}else{

					//add id and username to message
					message.author.id = req.user._id;
					message.author.username = req.user.username;
					message.author.profilePicture = req.user.profilePicture;
					//save message
					message.save();

					user.messages.push(message);
					user.save();

					req.flash("success","Added new message");
					res.redirect("/users/" + user._id);
				}
			});
		}
	});	
});

//edit message route
app.get("/users/:id/messages/:message_id/edit",function(req,res){	
	User.findById(req.params.id,function(err,foundUser){
		if(err || !foundUser){
			req.flash("error","User not found");
			res.redirect("/users");
		}

		Message.findById(req.params.message_id, function(err,foundMessage){
			if(err || !foundMessage){
				req.flash("error","Message not found");
				res.redirect("/users/" + user._id);
			} else{
				res.render("messages/edit",{user: foundUser, message: foundMessage});
			}
		});		
	});
});

//update messages on user profile
app.put("/users/:id/messages/:message_id", function(req,res){
	Message.findByIdAndUpdate(req.params.message_id, req.body.message, function(err, updatedComment){
		if(err){
			req.flash("err","Couldn't change message");
			res.redirect("/users/" + req.params.id);
		}else{
			req.flash("success","Message changed");
			res.redirect("/users/" + req.params.id);
		}
	});
});


//delete message route
app.delete("/users/:id/messages/:message_id", function(req,res){

	Message.findByIdAndRemove(req.params.message_id, function(err){
		if(err){
			req.flash("Couldn't delete message");
			res.redirect("/users/" + req.params.id);
		} else{
			req.flash("success","Message remove successfully");
			res.redirect("/users/" + req.params.id);
		}
	});
});



// ==========AUTHENTICATION ROUTES ===============//

//sign in route
app.get("/register",function(req,res){
	res.render("register");
});

//sign up logic
app.post("/register",function(req,res){

	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	var confirm = req.body.confirm;

	var newUser = {username: username, email: email};

	if(password === confirm){
		User.register(newUser, password, function(err,newlyCreatedUser){
			if(err){
				console.log(err.message);
				req.flash("error",err.message);
				return res.redirect("register");
			} else{
				passport.authenticate("local")(req,res,function(){
					console.log(newlyCreatedUser);
					req.flash("success","Welcome to Perfect Match");
					res.redirect("/login");
				});
			}
		});
	}
});


//login route
app.get("/login",function(req,res){
	res.render("login");
});

//login logic
app.post("/login",passport.authenticate("local",{ //use middlewear >> put in middlewear later
		successRedirect: "/users",
		failureRedirect: "/login"
	}),function(req,res){
});

//logout logic
app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/");
});


function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error","You need to be logged in to do that");
	res.redirect("/login");
}

/*
function checkUser(req,res,next){
	if(req.isAuthenticated){

		User.findById()
	}
}
*/


function getAge(birth){
	var today = new Date();
	var birthDate = new Date(birth);

	var age = today.getFullYear() - birthDate.getFullYear();
	var month = today.getMonth() - birthDate.getMonth();

	if(month < 0 || (month === 0 && today.getDate() < birthDate.getDate )){
		age --;
	}
	return age; 
}

function escapeRegex(text) {
    return text.toString().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};





app.get("*", function(req,res){
	res.send("Page not found");
});

app.listen(3000,function(req,res){
	console.log("Server started");
});