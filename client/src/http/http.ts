import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:3000',
    timeout: 4000,
})

export const getRequest = (url = '', params = {}, config = {}) => {
    return instance({
        method: 'get',
        url,
        params,
        ...config
    }).then(response => {
        return response
    })
}

export const postRequest = (url = '', data = {}, config = {}) => {
    return instance({
        method: 'post',
        url,
        data,
        ...config
    }).then(response => {
        return response
    })
}

export const deleteRequest = (url = '', data = {}, config = {}) => {
    return instance({
        method: 'delete',
        url,
        data,
        ...config
    }).then(response => {
        return response
    })
}