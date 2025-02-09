// import { StatusCodes as status } from 'http-status-codes';
// import { NextFunction, Response } from 'express';

// import { CustomRequest } from '../../types';
// import { sendError } from '../../library/errors';

// export const verifyRecaptcha = async (
//   req: CustomRequest,
//   _: Response,
//   next: NextFunction,
// ) => {
//   if (process.env.NODE_ENV === 'production') {
//     // captcha key
//     const { RECAPTCHA_SERVER_KEY } = process.env;

//     // human key
//     const humanKey = req.headers?.grecaptcha;

//     // check if captcha token is available
//     if (!humanKey)
//       sendError.unauthenticatedError('Please, provide a valid captcha token');

//     // Validate Human
//     await fetch(
//       'https://www.google.com/recaptcha/api/siteverify', // hcaptcha :: https://hcaptcha.com/siteverify
//       {
//         method: 'post',
//         headers: {
//           Accept: 'application/json',
//           'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
//         },
//         body: `secret=${RECAPTCHA_SERVER_KEY}&response=${humanKey}`,
//       },
//     )
//       .then((res) => res.json())
//       .then((data) => {
//         console.log(data);
//         return data?.success;
//       })
//       .catch(() => {
//         sendError.unauthorizationError('Invalid captcha token');
//       });

//     // The code below will run only after the reCAPTCHA is succesfully validated.
//     next();
//   }

//   next();
// };
