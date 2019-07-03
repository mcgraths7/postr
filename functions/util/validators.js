const isEmpty = string => {
  return string.trim() === '';
};

const isValidEmail = email => {
  // ? This regex matches valid emails
  const validEmailFormat = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return validEmailFormat.test(email);
};

const isStrongPassword = password => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;
  return strongRegex.test(password);
};

exports.validateSignupData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = 'must not be empty';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'must be valid';
  }

  if (isEmpty(data.password)) {
    errors.password = 'must not be empty';
  } else if (!isStrongPassword(data.password)) {
    errors.password =
      'must contain the following: 1 digit, 1 uppercase character, 1 lowercase character, at be least 8 characters long';
  } else if (data.password !== data.confirmPassword) {
    errors.password = 'passwords must match';
  }

  if (isEmpty(data.handle)) {
    errors.handle = 'must not be empty';
  }

  if (Object.keys(errors).length > 0) {
    response.status(400).json(errors);
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = data => {
  let errors = {};

  if (isEmpty(data.username)) {
    errors.email = 'must not be empty';
  }
  if (isEmpty(data.password)) {
    errors.password = 'must not be empty';
  }

  if (Object.keys(errors) > 0) {
    return response.status(400).json(errors);
  }

  return {
    errors,
    isValid: Object.keys(errors) === 0 ? true : false,
  };
};
