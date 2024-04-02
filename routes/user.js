import express from "express";
import { changePassword, forgetPassword, getMyProfile, logOut, login, register, resetPassword, updatePicture, updateProfile } from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { singleUpload } from "../middlewares/multer.js";

const router = express.Router();

router.post("/login", login);

router.post("/register",singleUpload, register);

router.get("/me", isAuthenticated, getMyProfile);

router.get("/logout", isAuthenticated, logOut);

//Updating Routes
router.put("/updateprofile",isAuthenticated,updateProfile);
router.put("/changepassword",isAuthenticated,changePassword);
router.put("/updatepicture",isAuthenticated,singleUpload,updatePicture);

//Forget Password & Reset Password

router.route("/forgetpassword").post(forgetPassword).put(resetPassword);

export default router;