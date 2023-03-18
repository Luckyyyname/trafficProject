import { getRequest, postRequest, deleteRequest } from '@/http/http'

export const getCarInfo = function () {
    return getRequest('/api/profiles/info');
}