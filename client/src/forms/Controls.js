import React from "react";

import { Select, Input, Typography } from "antd";

const { Text } = Typography;

export const SelectInput = ({ formik, label, ...props }) => {
  const { value, onChange, ...propsToPass } = props;
  const error = formik.errors[props.name];
  const touched = formik.touched.hasOwnProperty(props.name);
  return (
    <div className="py-2">
      <Text strong>{label}</Text>
      <div className="mt-2">
        <Select
          //   defaultValue={value}
          value={formik.values[props.name]}
          onChange={value => {
            console.log("new value is: ", value);
            formik.setFieldValue(props.name, value);
          }}
          onBlur={formik.handleBlur}
          {...propsToPass}
        />
        {error && touched === true ? (
          <div className="error py-2 text-red-900">{error}</div>
        ) : null}
      </div>
    </div>
  );
};

export const TextInput = ({ formik, theRef, label, ...props }) => {
  const error = formik.errors[props.name];
  const touched = formik.touched.hasOwnProperty(props.name);
  return (
    <div className="py-2">
      <Text strong>{label}</Text>
      <div className="mt-2">
        <Input
          value={formik.values[props.name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          //   onBlur={() => onBlur(props.name)}
          {...props}
          ref={theRef ? theRef : null}
        />
        {error && touched === true ? (
          <div className="error py-2 text-red-900">{error}</div>
        ) : null}
      </div>
    </div>
  );
};

export const PasswordInput = ({ formik, label, ...props }) => {
  const error = formik.errors[props.name];
  const touched = formik.touched.hasOwnProperty(props.name);
  return (
    <div className="py-2">
      <Text strong>{label}</Text>
      <div className="mt-2">
        <Input.Password
          value={formik.values[props.name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          {...props}
        />
        {error && touched === true ? (
          <div className="error py-2 text-red-900">{error}</div>
        ) : null}
      </div>
    </div>
  );
};
