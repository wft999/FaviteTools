import {connect} from 'react-redux';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';


import {
    manualUpdateProject
} from '../../reducers/project-state';

import saveButtonIcon from './icon--save-button.svg';
import styles from './save-button.css';

const SaveButtonComponent = function (props) {
    const {
    	projectChanged,
        active,
        className,
        onClick,
        title,
        ...componentProps
    } = props;
    return projectChanged && (
        <img
            className={classNames(
                className,
                styles.greenFlag,
                {
                    [styles.isActive]: active
                }
            )}
            draggable={false}
            src={saveButtonIcon}
            title={title}
            onClick={onClick}
            {...componentProps}
        />
    );
};
SaveButtonComponent.propTypes = {
    active: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    title: PropTypes.string,
    projectChanged: PropTypes.bool
};
SaveButtonComponent.defaultProps = {
    active: false,
    title: 'Save'
};
const mapStateToProps = state => ({
    projectChanged: state.scratchGui.projectChanged
});

const mapDispatchToProps = dispatch => ({
    onClick: () => dispatch(manualUpdateProject())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SaveButtonComponent);
