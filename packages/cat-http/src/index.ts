import { requestSerializer } from "./request"
import { responseSerializer } from "./response"

export { requestSerializer, responseSerializer }

/**
 * HTTP serializers for @sylphx/cat
 *
 * Standard serializers for HTTP requests and responses
 */
export const httpSerializers = {
	req: requestSerializer,
	request: requestSerializer,
	res: responseSerializer,
	response: responseSerializer,
}
