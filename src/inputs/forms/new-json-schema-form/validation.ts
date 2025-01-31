import type { Ref } from '@vue/composition-api';
import {
    computed, reactive, toRefs, watch,
} from '@vue/composition-api';

import type { ErrorObject, ValidateFunction } from 'ajv';
import Ajv from 'ajv';
import type { Localize } from 'ajv-i18n/localize/types';
import { isEmpty } from 'lodash';

import type { JsonSchemaFormProps, InnerJsonSchema } from '@/inputs/forms/new-json-schema-form/type';

export const useValidation = (props: JsonSchemaFormProps, { formData, localize }: {
    formData: Ref<object>;
    localize: Ref<Localize|null>;
}) => {
    const ajv = new Ajv({
        allErrors: true,
    });
    const state = reactive({
        validator: computed<ValidateFunction|null>(() => {
            if (props.schema?.properties && !isEmpty(props.schema?.properties)) {
                return ajv.compile(props.schema);
            }
            return null;
        }),
        validatorErrors: null as ErrorObject[]|null,
        invalidMessages: computed<Record<string, string|undefined>>(() => {
            const errorObj = {};

            if (state.validatorErrors) {
                if (localize.value) {
                    localize.value(state.validatorErrors);
                }

                state.validatorErrors.forEach((error) => {
                    if (!error.instancePath) {
                        /*
                         when the formData value is undefined, dataPath is empty string.
                         so before user input nothing, get required error property names from error.params' value.
                         */
                        Object.values(error.params).forEach((property) => {
                            errorObj[property] = error.message;
                        });
                    } else {
                        const dataKey = error.instancePath.slice(1);
                        errorObj[dataKey] = error.message;
                    }
                });
            }
            return errorObj;
        }),
        inputOccurred: {} as Record<string, boolean|undefined>,
    });

    const validateFormData = (): boolean => {
        const validator = state.validator;
        if (!validator) return false;

        const valid = validator(formData.value);

        if (!valid && validator.errors) {
            state.validatorErrors = validator.errors;
        } else {
            state.validatorErrors = null;
        }

        return valid;
    };

    const getPropertyInvalidState = (property: InnerJsonSchema): boolean|undefined => {
        if (props.validationMode === 'all') return !!state.invalidMessages[property.id];
        if (props.validationMode === 'input' && state.inputOccurred[property.id]) return !!state.invalidMessages[property.id];
        return undefined;
    };

    watch(() => props.validationMode, (validationMode) => {
        if (validationMode === 'all') validateFormData();
    }, { immediate: true });

    return {
        ...toRefs(state),
        validateFormData,
        getPropertyInvalidState,

    };
};
