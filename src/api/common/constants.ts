const EMAIL_PATTERN = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const EMAIL_NAME_PATTERN = /^.*(?=@)/;

const IMAGES_FOLDER_FILE_PATTERN = /\/images\/.*/;

const ACCESS_TOKEN_EXP_SECONDS = 60 * 60;
const REFRESH_TOKEN_EXP_SECONDS = 60 * 60 * 24 * 30;

export {EMAIL_PATTERN, EMAIL_NAME_PATTERN, IMAGES_FOLDER_FILE_PATTERN, ACCESS_TOKEN_EXP_SECONDS, REFRESH_TOKEN_EXP_SECONDS};