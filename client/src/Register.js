import React, { useState, useEffect, useCallback } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";

import { useAppState } from "./context/App";

import { Button, Col, Select, Modal, message } from "antd";
import { TextInput, PasswordInput, SelectInput } from "forms/Controls";

const { Option } = Select;

export const RegisterModal = ({ visibility, onRegisterSuccess }) => {
  const [modalVisible, setModalVisible] = visibility;
  const [registerModalLoading, setRegisterModalLoading] = useState(false);

  const appState = useAppState();
  let { backendServer } = appState;
  const registerUserRef = useCallback(node => {
    if (node) node.focus();
  }, []);

  const onOk = useCallback(
    values => {
      fetch(backendServer + "/users/register", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          accountType: values.accountType
        })
      })
        .then(response => response.json())
        .then(json => {
          if (json.error) {
            handleError(json.error);
            setRegisterModalLoading(false);
          } else {
            setRegisterModalLoading(false);
            setModalVisible(false);
            onRegisterSuccess(json);
          }
        })
        .catch(error => {
          handleError(error);
          setRegisterModalLoading(false);
        });
    },
    [backendServer, onRegisterSuccess, setModalVisible]
  );

  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
      email: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      accountType: "viewer"
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Please enter a username"),
      password: Yup.string().required("Please specify a password"),
      confirmPassword: Yup.string().required("Please type the password again"),
      email: Yup.string()
        .email("Please enter a valid email address")
        .required("Plese enter an email address"),
      firstName: Yup.string().required("Please enter first name"),
      lastName: Yup.string().required("Please enter last name"),
      accountType: Yup.string()
        .oneOf(["dj", "viewer"])
        .required("Please specify an account type")
    }),
    onSubmit: (values, { setSubmitting }) => {
      onOk(values);
    },
    validate: values => {
      const errors = {};
      // console.log("Calling validate with: ", values);
      if (values.password !== values.confirmPassword) {
        errors.passwordConfirmation = "Passwords do not match";
      }

      // console.log("Validate errors is: ", errors);

      return errors;
    }
  });
  // console.log("formik is: ", formik);

  const onCancel = useCallback(() => {
    setModalVisible(false);
  }, [setModalVisible]);

  const handleError = error => {
    console.log("Got error: ", error);
    message.error({
      content: String(error),
      key: "registerError",
      duration: 2
    });
  };

  useEffect(() => {
    console.log("Visibility changed: ", modalVisible);
    if (modalVisible === true) {
      formik.resetForm();
    }
  }, [modalVisible]);

  return (
    <Modal
      title="Create an account to use OmniDJ"
      visible={modalVisible}
      onOk={() => {
        formik.handleSubmit();
      }}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Return
        </Button>,
        <Button
          key="register"
          type="primary"
          loading={registerModalLoading}
          onClick={() => formik.handleSubmit()}
        >
          Create account
        </Button>
      ]}
      destroyOnClose={true}
    >
      <Col>
        <form onSubmit={formik.handleSubmit}>
          <TextInput
            label="Username"
            name="username"
            type="text"
            placeholder="Enter a username"
            theRef={registerUserRef}
            formik={formik}
          />
          <TextInput
            label="E-mail"
            name="email"
            type="email"
            placeholder="Enter your e-mail"
            formik={formik}
          />
          <PasswordInput
            label="Password"
            name="password"
            type="text"
            placeholder="Enter a password"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.password}
            formik={formik}
          />
          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            type="text"
            placeholder="Re-type the password"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.confirmPassword}
            formik={formik}
          />
          {!formik.errors.confirmPassword &&
          formik.errors.passwordConfirmation ? (
            <div className="error py-2 text-red-900">
              {formik.errors.passwordConfirmation}
            </div>
          ) : null}
          <TextInput
            label="First name"
            name="firstName"
            type="text"
            placeholder="Enter first name"
            formik={formik}
          />
          <TextInput
            label="Last name"
            name="lastName"
            type="text"
            placeholder="Enter last name"
            formik={formik}
          />
          <SelectInput
            label="Account Type"
            name="accountType"
            value={formik.values.accountType}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            formik={formik}
          >
            <Option value="dj">DJ</Option>
            <Option value="viewer">Viewer</Option>
          </SelectInput>
        </form>
      </Col>
    </Modal>
  );
};
