import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';



const generateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating tokens")
    }
}



const registerUser = asyncHandler(async (req , res ) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar

    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response



    //1. get user details from frontend
    const{fullname, email, username , password} = req.body
    console.log("email", email);



    //2. validation - not empty
    if(
        [fullname , email , username , password].some((field) =>
            field?.trim() === ""
        )
    ){
        throw new ApiError(400 , "All field are required")
    }



    //3. check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if(existedUser){
        throw new ApiError(409 , "User already exists")
    }



    //4. check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar is required")
    }

    5. // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if(!avatar){
        throw new ApiError(400 , "Avatar is required")
    }


    6. // create user object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    7. // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering user")
    }


    8. // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser , "User registered successfully")
    )
    
})

const loginUser = asyncHandler(async(req , res) => {
    // get user details from frontend
    // username or email
    // find the user
    // password validation
    // generate access and refresh token
    // send cookie
    // return response


    //1. get user details from frontend
    const {email , username , password} = req.body


    //2. username or email
    if(!(username || email)){
        throw new ApiError(400 , "Username or email is required")
    }



    3. // find the user
    const user = await User.findOne({
        $or: [{email} , {username}]
    })

    if(!user){
        throw new ApiError(404 , "User not found")
    }



    //4. password validation
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid user credentials")
    }



    //5. generate access and refresh token
    const {accessToken , refreshToken} = await generateAccessTokenAndRefreshToken(user._id)


    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")


    //6. send cookie
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        },
        "User logged in successfully"
    )
    )
})



const logoutUser = asyncHandler(async(req , res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )


    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200 , {} , "User logged out successfully")
    )
})



export {registerUser, loginUser, logoutUser}