var express = require("express");
var router 	= express.Router();
var User = require("../models/user");


//show all users and search route
router.get("/", function(req,res){

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
router.get("/users/:id", function(req,res){
	
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
router.get("/users/:id/edit",function(req,res){	
	User.findById(req.params.id,function(err,foundUser){
		if(err || !foundUser){
			req.flash("error","User not found");
			res.redirect("/users");
		}
		res.render("users/edit",{user: foundUser});
	});
});

//update user profile route
router.put("/users/:id", function(req,res){
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