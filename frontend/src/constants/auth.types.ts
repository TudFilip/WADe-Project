export type LoginBody = {
    email: string;
    password: string;
};

export type RegisterAccountBody = {
    email: string;
    password: string;
    fullname: string;
    age?: number;
};
