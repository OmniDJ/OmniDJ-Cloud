import React, { useState, useEffect, useCallback } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";

import { useAppState } from "./context/App";

import { Button, Col, Select, Modal, message } from "antd";
import { TextInput } from "forms/Controls";

const { Option } = Select;

export const ProfileModal = ({ visibility, onProfileEditSuccess }) => {
  const [modalVisible, setModalVisible] = visibility;
  const [profileModalLoading, setProfileModalLoading] = useState(false);

  const appState = useAppState();
  const { userInfo, isDJ } = appState;
  let { backendServer } = appState;

  const onOk = useCallback(
    values => {
      fetch(backendServer + "/users/edit", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName
        })
      })
        .then(response => response.json())
        .then(json => {
          if (json.error) {
            handleError(json.error);
            setProfileModalLoading(false);
          } else {
            setProfileModalLoading(false);
            setModalVisible(false);
            onProfileEditSuccess(json);
          }
        })
        .catch(error => {
          handleError(error);
          setProfileModalLoading(false);
        });
    },
    [backendServer, onProfileEditSuccess, setModalVisible]
  );

  const formik = useFormik({
    initialValues: {
      username: userInfo.username,
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName
    },
    validationSchema: Yup.object({
      username: Yup.string().required("Please enter a username"),
      email: Yup.string()
        .email("Please enter a valid email address")
        .required("Plese enter an email address"),
      firstName: Yup.string().required("Please enter first name"),
      lastName: Yup.string().required("Please enter last name")
    }),
    onSubmit: (values, { setSubmitting }) => {
      onOk(values);
    },
    validate: values => {
      const errors = {};
      // console.log("Calling validate with: ", values);
      // if (values.password !== values.confirmPassword) {
      //   errors.passwordConfirmation = "Passwords do not match";
      // }

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
      key: "editError",
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
      title="Edit your profile"
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
          key="saveuser"
          type="primary"
          loading={profileModalLoading}
          onClick={() => formik.handleSubmit()}
        >
          Save
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
            formik={formik}
          />
          <TextInput
            label="E-mail"
            name="email"
            type="email"
            placeholder="Enter your e-mail"
            formik={formik}
          />
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
        </form>
      </Col>
    </Modal>
  );
};
